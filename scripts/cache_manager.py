import hashlib
import json
import os
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class PlanProcessingCache:
    """
    Cache persistant avec invalidation basée sur:
    - Hash SHA256 du fichier image
    - Version du pipeline (invalidation auto si upgrade)
    - TTL configurable (défaut 7 jours)
    """
    
    CACHE_VERSION = "v8.0"  # Incrémenter si changement algorithme
    DEFAULT_TTL_DAYS = 7
    
    def __init__(self, cache_dir: str = "./cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Sous-dossiers par étape
        self.classification_cache = self.cache_dir / "classification"
        self.vectorization_cache = self.cache_dir / "vectorization"
        self.yolo_cache = self.cache_dir / "yolo_results"
        self.furniture_cache = self.cache_dir / "furniture_masks"
        
        for subdir in [self.classification_cache, self.vectorization_cache, 
                       self.yolo_cache, self.furniture_cache]:
            subdir.mkdir(exist_ok=True)
    
    def get_file_hash(self, file_path: str) -> str:
        """Calcul SHA256 optimisé (lecture par chunks)"""
        sha256_hash = hashlib.sha256()
        
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        
        return sha256_hash.hexdigest()
    
    def _get_cache_key(self, file_hash: str, step: str) -> str:
        """Clé unique combinant hash + version + étape"""
        return f"{self.CACHE_VERSION}_{step}_{file_hash}"
    
    def _get_cache_path(self, cache_key: str, subdir: Path, extension: str = ".json") -> Path:
        return subdir / f"{cache_key}{extension}"
    
    def _is_cache_valid(self, cache_path: Path) -> bool:
        """Vérification TTL"""
        if not cache_path.exists():
            return False
        
        file_age = datetime.now() - datetime.fromtimestamp(cache_path.stat().st_mtime)
        return file_age < timedelta(days=self.DEFAULT_TTL_DAYS)
    
    # ===== CLASSIFICATION =====
    
    def get_classification(self, file_hash: str) -> Optional[str]:
        """Récupère classification en cache (Type A/B/C)"""
        cache_key = self._get_cache_key(file_hash, "classification")
        cache_path = self._get_cache_path(cache_key, self.classification_cache)
        
        if self._is_cache_valid(cache_path):
            with open(cache_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                logger.info(f"✅ Cache HIT - Classification: {data.get('input_type')}")
                return data.get('input_type')
        
        return None
    
    def set_classification(self, file_hash: str, input_type: str, metrics: dict):
        """Sauvegarde classification"""
        cache_key = self._get_cache_key(file_hash, "classification")
        cache_path = self._get_cache_path(cache_key, self.classification_cache)
        
        data = {
            'input_type': input_type,
            'metrics': metrics,
            'timestamp': datetime.now().isoformat(),
            'version': self.CACHE_VERSION
        }
        
        with open(cache_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        
        logger.info(f"💾 Cache SAVED - Classification: {input_type}")
    
    # ===== VECTORIZATION =====
    
    def get_vectorized_image(self, file_hash: str) -> Optional[str]:
        """Récupère image vectorisée (Type B uniquement)"""
        cache_key = self._get_cache_key(file_hash, "vectorized")
        cache_path = self._get_cache_path(cache_key, self.vectorization_cache, ".png")
        
        if self._is_cache_valid(cache_path):
            logger.info(f"✅ Cache HIT - Vectorisation")
            return str(cache_path)
        
        return None
    
    def set_vectorized_image(self, file_hash: str, image_array, metrics: dict):
        """Sauvegarde image vectorisée"""
        import cv2
        
        cache_key = self._get_cache_key(file_hash, "vectorized")
        img_path = self._get_cache_path(cache_key, self.vectorization_cache, ".png")
        meta_path = self._get_cache_path(cache_key, self.vectorization_cache, ".json")
        
        cv2.imwrite(str(img_path), image_array)
        
        with open(meta_path, 'w', encoding='utf-8') as f:
            json.dump({
                'metrics': metrics,
                'timestamp': datetime.now().isoformat()
            }, f, indent=2)
        
        logger.info(f"💾 Cache SAVED - Vectorisation")
    
    # ===== YOLO RESULTS =====
    
    def get_yolo_result(self, file_hash: str) -> Optional[Dict[str, Any]]:
        """Récupère résultat segmentation YOLO"""
        cache_key = self._get_cache_key(file_hash, "yolo")
        cache_path = self._get_cache_path(cache_key, self.yolo_cache)
        
        if self._is_cache_valid(cache_path):
            with open(cache_path, 'r', encoding='utf-8') as f:
                logger.info(f"✅ Cache HIT - YOLO segmentation")
                return json.load(f)
        
        return None
    
    def set_yolo_result(self, file_hash: str, yolo_data: dict):
        """Sauvegarde résultat YOLO"""
        cache_key = self._get_cache_key(file_hash, "yolo")
        cache_path = self._get_cache_path(cache_key, self.yolo_cache)
        
        with open(cache_path, 'w', encoding='utf-8') as f:
            json.dump(yolo_data, f, indent=2)
        
        logger.info(f"💾 Cache SAVED - YOLO segmentation")
    
    # ===== FURNITURE MASKS =====
    
    def get_furniture_mask(self, file_hash: str) -> Optional[tuple]:
        """Récupère masque mobilier + placement logic"""
        cache_key = self._get_cache_key(file_hash, "furniture")
        mask_path = self._get_cache_path(cache_key, self.furniture_cache, ".png")
        logic_path = self._get_cache_path(cache_key, self.furniture_cache, ".json")
        
        if self._is_cache_valid(mask_path) and logic_path.exists():
            import cv2
            mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)
            
            with open(logic_path, 'r', encoding='utf-8') as f:
                placement_logic = json.load(f)
            
            logger.info(f"✅ Cache HIT - Furniture mask")
            return mask, placement_logic
        
        return None
    
    def set_furniture_mask(self, file_hash: str, mask_array, placement_logic: dict):
        """Sauvegarde masque + logic"""
        import cv2
        
        cache_key = self._get_cache_key(file_hash, "furniture")
        mask_path = self._get_cache_path(cache_key, self.furniture_cache, ".png")
        logic_path = self._get_cache_path(cache_key, self.furniture_cache, ".json")
        
        cv2.imwrite(str(mask_path), mask_array)
        
        with open(logic_path, 'w', encoding='utf-8') as f:
            json.dump(placement_logic, f, indent=2)
        
        logger.info(f"💾 Cache SAVED - Furniture mask")
    
    def clear_expired(self):
        """Nettoyage automatique des entrées expirées"""
        deleted_count = 0
        
        for subdir in [self.classification_cache, self.vectorization_cache,
                       self.yolo_cache, self.furniture_cache]:
            for cache_file in subdir.glob("*"):
                if not self._is_cache_valid(cache_file):
                    cache_file.unlink()
                    deleted_count += 1
        
        logger.info(f"🧹 Cache cleanup: {deleted_count} fichiers expirés supprimés")
        return deleted_count
    
    def get_stats(self) -> dict:
        """Statistiques du cache"""
        stats = {}
        
        for name, subdir in [
            ('classification', self.classification_cache),
            ('vectorization', self.vectorization_cache),
            ('yolo', self.yolo_cache),
            ('furniture', self.furniture_cache)
        ]:
            files = list(subdir.glob("*"))
            valid_files = [f for f in files if self._is_cache_valid(f)]
            
            total_size = sum(f.stat().st_size for f in files)
            
            stats[name] = {
                'total_entries': len(files),
                'valid_entries': len(valid_files),
                'size_mb': round(total_size / (1024 * 1024), 2)
            }
        
        return stats
