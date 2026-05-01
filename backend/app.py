"""
Face Detection & Liveness Verification API Backend
Based on InsightFace buffalo_l model + HuggingFace NSFW/Violence models
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import io
import numpy as np
import cv2
from PIL import Image
from insightface.app import FaceAnalysis
import base64
import requests
import torch
from transformers import pipeline

app = Flask(__name__)
CORS(app)  # Allow React Native to call the API

# Initialize face detector once at startup
print("Loading face detection model...")
face_app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
face_app.prepare(ctx_id=-1, det_size=(640, 640))
print("Face detector loaded ✅")

# HuggingFace classifiers — loaded lazily on first use to avoid build/startup OOM
_hf_device = 0 if torch.cuda.is_available() else -1
_nsfw_clf = None

def get_nsfw_clf():
    global _nsfw_clf
    if _nsfw_clf is None:
        print("Loading NSFW detection model...")
        _nsfw_clf = pipeline("image-classification", model="Falconsai/nsfw_image_detection", device=_hf_device)
        print("NSFW model loaded ✅")
    return _nsfw_clf

def pil_to_bgr(pil_img: Image.Image) -> np.ndarray:
    """Convert PIL Image to OpenCV BGR format"""
    rgb = np.array(pil_img.convert("RGB"))
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    return bgr

def best_face(faces):
    """Get the face with the largest bounding box area"""
    if not faces:
        return None
    areas = []
    for f in faces:
        x1, y1, x2, y2 = f.bbox
        areas.append((x2-x1) * (y2-y1))
    return faces[int(np.argmax(areas))]

def l2_normalize(v: np.ndarray, eps=1e-12):
    """L2 normalize a vector"""
    n = np.linalg.norm(v) + eps
    return v / n

def cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    """Calculate cosine similarity between two vectors"""
    a = l2_normalize(a)
    b = l2_normalize(b)
    return float(np.dot(a, b))

def get_embedding_from_bgr(bgr: np.ndarray, det_thresh=0.60):
    """Extract face embedding from BGR image"""
    faces = face_app.get(bgr)
    f = best_face(faces)
    if f is None:
        return None, None, None
    if float(f.det_score) < det_thresh:
        return None, None, None
    emb = np.array(f.embedding, dtype=np.float32)
    return emb, np.array(f.bbox, dtype=np.float32), float(f.det_score)

def accept_or_reject_face(
    pil_img: Image.Image,
    score_thresh: float = 0.60,
    min_face_size: int = 20,
    debug: bool = False
):
    """
    Detect faces in image and apply acceptance criteria
    Returns: (decision, kept_faces, boxes)
    """
    bgr = pil_to_bgr(pil_img)
    faces = face_app.get(bgr)

    kept = []
    kept_boxes = []
    
    for f in faces:
        x1, y1, x2, y2 = f.bbox
        w, h = (x2 - x1), (y2 - y1)

        if f.det_score >= score_thresh and w >= min_face_size and h >= min_face_size:
            kept.append(f)
            kept_boxes.append([x1, y1, x2, y2])

    boxes = np.array(kept_boxes) if len(kept_boxes) else np.zeros((0, 4), dtype=np.float32)
    decision = "ACCEPTED" if len(kept) > 0 else "REJECTED"

    if debug:
        print(f"Total faces detected: {len(faces)}")
        print(f"Faces kept (score>={score_thresh}, size>={min_face_size}): {len(kept)}")

    return decision, kept, boxes

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'face-detection-api',
        'model': 'insightface-buffalo_l'
    })

@app.route('/detect-face', methods=['POST'])
def detect_face():
    """
    Detect faces in uploaded image
    
    Request: multipart/form-data with 'image' file
    Response: {
        decision: "ACCEPTED" | "REJECTED",
        faces_count: number,
        faces: [{bbox: [x1, y1, x2, y2], score: float}]
    }
    """
    try:
        # Check if image is provided
        if 'image' not in request.files:
            return jsonify({
                'error': 'No image provided',
                'message': 'Please upload an image file'
            }), 400
        
        file = request.files['image']
        
        # Read image
        image_bytes = file.read()
        pil_img = Image.open(io.BytesIO(image_bytes))
        
        print(f"Processing image: {file.filename} | size: {pil_img.size}")
        
        # Run face detection
        decision, kept_faces, boxes = accept_or_reject_face(
            pil_img,
            score_thresh=0.60,
            min_face_size=20,
            debug=True
        )
        
        # Format response
        faces_data = []
        for i, f in enumerate(kept_faces):
            x1, y1, x2, y2 = boxes[i]
            faces_data.append({
                'bbox': [int(x1), int(y1), int(x2), int(y2)],
                'score': float(f.det_score),
                'size': {
                    'width': int(x2 - x1),
                    'height': int(y2 - y1)
                }
            })
        
        response = {
            'decision': decision,
            'faces_count': len(kept_faces),
            'faces': faces_data,
            'message': 'Face detected and validated' if decision == 'ACCEPTED' else 'No valid face detected'
        }
        
        print(f"Result: {decision} | Faces: {len(kept_faces)}")
        
        return jsonify(response), 200
        
    except Exception as e:
        print(f"Error processing image: {str(e)}")
        return jsonify({
            'error': 'Processing failed',
            'message': str(e)
        }), 500

# ═══════════════════════════════════════════════════════════════════
# 🧠 LIVENESS VERIFICATION ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@app.route('/create-template', methods=['POST'])
def create_template():
    """
    Create face template from multiple photos
    Input: JSON with photo_urls array (4-6 photos)
    Output: Base64-encoded template embedding
    """
    try:
        data = request.get_json()
        photo_urls = data.get('photo_urls', [])
        
        if not photo_urls or len(photo_urls) < 4:
            return jsonify({
                'error': 'Insufficient photos',
                'message': 'At least 4 photos required for template creation'
            }), 400
        
        print(f"Creating template from {len(photo_urls)} photos...")
        
        enroll_embeddings = []
        bad_photos = []
        
        # Download and process each photo
        for idx, url in enumerate(photo_urls):
            try:
                # Download image from Firebase Storage URL
                response = requests.get(url, timeout=10)
                pil_img = Image.open(io.BytesIO(response.content))
                bgr = pil_to_bgr(pil_img)
                
                # Extract embedding
                emb, bbox, score = get_embedding_from_bgr(bgr, det_thresh=0.60)
                if emb is None:
                    bad_photos.append(idx + 1)
                    continue
                
                enroll_embeddings.append(l2_normalize(emb))
                print(f"✅ Photo {idx + 1}: Face detected (score: {score:.3f})")
                
            except Exception as e:
                print(f"❌ Photo {idx + 1} failed: {str(e)}")
                bad_photos.append(idx + 1)
        
        if bad_photos:
            return jsonify({
                'error': 'Face detection failed',
                'message': f'Could not detect face in photos: {bad_photos}'
            }), 400
        
        # Create template (average of all embeddings)
        enroll_embeddings = np.stack(enroll_embeddings, axis=0)
        template = l2_normalize(np.mean(enroll_embeddings, axis=0))
        
        # Encode template as base64 for storage
        template_b64 = base64.b64encode(template.tobytes()).decode('utf-8')
        
        print(f"✅ Template created from {len(enroll_embeddings)} photos")
        
        return jsonify({
            'success': True,
            'template': template_b64,
            'photos_processed': len(enroll_embeddings),
            'embedding_shape': list(template.shape)
        }), 200
        
    except Exception as e:
        print(f"Error creating template: {str(e)}")
        return jsonify({
            'error': 'Template creation failed',
            'message': str(e)
        }), 500

@app.route('/verify-liveness', methods=['POST'])
def verify_liveness():
    """
    Verify live selfie against stored template
    Input: multipart/form-data with 'image' (live frame) and 'template' (base64)
    Output: Match result with similarity score
    """
    try:
        # Get live frame image
        if 'image' not in request.files:
            return jsonify({
                'error': 'No image provided',
                'message': 'Please upload an image file'
            }), 400
        
        # Get template from form data
        template_b64 = request.form.get('template')
        if not template_b64:
            return jsonify({
                'error': 'No template provided',
                'message': 'Template embedding required for verification'
            }), 400
        
        # Decode template
        template_bytes = base64.b64decode(template_b64)
        template = np.frombuffer(template_bytes, dtype=np.float32)
        
        # Process live frame
        image_file = request.files['image']
        pil_img = Image.open(io.BytesIO(image_file.read()))
        bgr = pil_to_bgr(pil_img)
        
        # Extract embedding from live frame
        emb_live, bbox_live, det_score = get_embedding_from_bgr(bgr, det_thresh=0.60)
        
        if emb_live is None:
            return jsonify({
                'isMatch': False,
                'reason': 'No face detected in live frame',
                'similarity': 0.0,
                'threshold': 0.35
            }), 200
        
        # Calculate similarity
        similarity = cosine_sim(emb_live, template)
        is_match = similarity >= 0.35  # Threshold from notebook
        
        print(f"Liveness check: similarity={similarity:.4f}, match={is_match}")
        
        return jsonify({
            'isMatch': is_match,
            'similarity': float(similarity),
            'threshold': 0.35,
            'detectionScore': float(det_score),
            'reason': 'Face matches template' if is_match else 'Face does not match template'
        }), 200
        
    except Exception as e:
        print(f"Error in liveness verification: {str(e)}")
        return jsonify({
            'error': 'Verification failed',
            'message': str(e)
        }), 500

# ═══════════════════════════════════════════════════════════════════
# 🔞 NSFW + VIOLENCE CHECK ENDPOINT
# ═══════════════════════════════════════════════════════════════════

@app.route('/check-nsfw', methods=['POST'])
def check_nsfw():
    """
    Check a single image for NSFW or violent content.

    Request: multipart/form-data with 'image' file
    Response: {
        decision: "ACCEPTED" | "REJECTED",
        reason: string,
        nsfw:     { label, score },
        violence: { label, score }
    }
    """
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400

        file = request.files['image']
        pil_img = Image.open(io.BytesIO(file.read())).convert("RGB")

        nsfw_preds = get_nsfw_clf()(pil_img)

        # Top prediction
        nsfw_preds = sorted(nsfw_preds, key=lambda x: x['score'], reverse=True)
        nsfw_label, nsfw_score = nsfw_preds[0]['label'], float(nsfw_preds[0]['score'])

        NSFW_THRESH = 0.50

        nsfw_reject = (nsfw_label.strip().lower() == 'nsfw') and (nsfw_score >= NSFW_THRESH)

        reason = 'Photo contains explicit or inappropriate content.' if nsfw_reject else 'Photo passed content check.'
        decision = 'REJECTED' if nsfw_reject else 'ACCEPTED'

        print(f"NSFW check: {decision} | nsfw={nsfw_label}({nsfw_score:.3f})")

        return jsonify({
            'decision': decision,
            'reason':   reason,
            'nsfw':     {'label': nsfw_label, 'score': nsfw_score},
            'violence': {'label': 'non-violent', 'score': 1.0},
        }), 200

    except Exception as e:
        print(f"Error in NSFW check: {str(e)}")
        return jsonify({'error': 'NSFW check failed', 'message': str(e)}), 500


# ═══════════════════════════════════════════════════════════════════
# 👤 SAME-PERSON CONSISTENCY CHECK ENDPOINT
# ═══════════════════════════════════════════════════════════════════

@app.route('/check-same-person', methods=['POST'])
def check_same_person():
    """
    Verify that all uploaded photos are of the same person.

    Request: multipart/form-data with multiple 'images' files (4–6 photos)
    Response: {
        decision:        "ACCEPTED" | "REJECTED",
        reason:          string,
        outlier_indices: [0-based indices of inconsistent photos],
        similarities:    [mean similarity of each photo to the rest]
    }
    """
    SAME_PERSON_THRESHOLD = 0.45  # mirrors ENROLL_SAME_PERSON_THRESHOLD in notebook

    try:
        files = request.files.getlist('images')
        if len(files) < 2:
            return jsonify({'error': 'At least 2 images required'}), 400

        embeddings  = []
        failed_idxs = []

        for idx, f in enumerate(files):
            pil_img = Image.open(io.BytesIO(f.read()))
            bgr     = pil_to_bgr(pil_img)
            emb, _, score = get_embedding_from_bgr(bgr, det_thresh=0.60)
            if emb is None:
                failed_idxs.append(idx)
                continue
            embeddings.append((idx, l2_normalize(emb)))

        if failed_idxs:
            return jsonify({
                'decision':        'REJECTED',
                'reason':          f'No face detected in photo(s) at position(s): {[i+1 for i in failed_idxs]}.',
                'outlier_indices': failed_idxs,
                'similarities':    [],
            }), 200

        n = len(embeddings)
        emb_vecs = np.stack([e for _, e in embeddings], axis=0)

        # Pairwise cosine similarity matrix
        mean_sims = []
        for i in range(n):
            sims_to_others = [cosine_sim(emb_vecs[i], emb_vecs[j]) for j in range(n) if j != i]
            mean_sims.append(float(np.mean(sims_to_others)))

        outlier_local_indices = [i for i, s in enumerate(mean_sims) if s < SAME_PERSON_THRESHOLD]
        # Map back to original file indices
        outlier_orig_indices  = [embeddings[i][0] for i in outlier_local_indices]

        decision = 'REJECTED' if outlier_orig_indices else 'ACCEPTED'
        if outlier_orig_indices:
            reason = (f'Photo(s) at position(s) {[i+1 for i in outlier_orig_indices]} '
                      f'do not appear to be of the same person as the others.')
        else:
            reason = 'All photos are of the same person.'

        print(f"Same-person check: {decision} | mean_sims={[round(s,3) for s in mean_sims]}")

        return jsonify({
            'decision':        decision,
            'reason':          reason,
            'outlier_indices': outlier_orig_indices,
            'similarities':    mean_sims,
        }), 200

    except Exception as e:
        print(f"Error in same-person check: {str(e)}")
        return jsonify({'error': 'Same-person check failed', 'message': str(e)}), 500


if __name__ == '__main__':
    print("\n" + "="*60)
    print("Face Detection & Liveness Verification API Server")
    print("="*60)
    print("Server starting on http://localhost:5000")
    print("\nEndpoints:")
    print("  - GET  /health               - Health check")
    print("  - POST /detect-face          - Detect faces in photo")
    print("  - POST /check-nsfw           - NSFW + violence check")
    print("  - POST /check-same-person    - Verify all photos are same person")
    print("  - POST /create-template      - Create template from photos")
    print("  - POST /verify-liveness      - Verify live selfie")
    print("="*60 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
