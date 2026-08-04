import json
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from typing import Dict, List, Any

class SpatialCoTPlanner:
    """
    Générateur de plans 2D déterministes par Spatial Chain-of-Thought (SCoT).
    Force Gemini 3.1 à générer une structure JSON de coordonnées cartésiennes strictes
    sans chevauchement, puis délègue le rendu vectoriel déterministe à Matplotlib.
    """
    def __init__(self):
        pass

    def validate_spatial_layout(self, layout: Dict[str, Any]) -> bool:
        """Vérifie l'absence de chevauchement entre les pièces (Bounding Box Collision Test)."""
        rooms = layout.get("rooms", [])
        num_rooms = len(rooms)

        for i in range(num_rooms):
            r1 = rooms[i]
            x1, y1, w1, h1 = r1["x"], r1["y"], r1["width"], r1["height"]
            for j in range(i + 1, num_rooms):
                r2 = rooms[j]
                x2, y2, w2, h2 = r2["x"], r2["y"], r2["width"], r2["height"]

                # Test de collision AABB 2D (avec tolérance 0.01)
                overlap_x = (x1 < x2 + w2 - 0.01) and (x1 + w1 > x2 + 0.01)
                overlap_y = (y1 < y2 + h2 - 0.01) and (y1 + h1 > y2 + 0.01)

                if overlap_x and overlap_y:
                    print(f"[SCoT Collision Detected] Chevauchement entre {r1['name']} et {r2['name']}")
                    return False
        return True

    def render_floorplan_to_file(self, layout: Dict[str, Any], output_image_path: str) -> str:
        """Génère une image vectorielle haute définition 2D du plan d'étage."""
        fig, ax = plt.subplots(figsize=(10, 10))
        ax.set_facecolor('#0f172a') # Fond sombre anthracite

        boundary = layout.get("building_boundary", {"width": 12, "height": 10})
        ax.set_xlim(-1, boundary["width"] + 1)
        ax.set_ylim(-1, boundary["height"] + 1)
        ax.set_aspect('equal')

        # Couleurs stylisées par type de pièce
        color_map = {
            "living_room": "#38bdf8",
            "bedroom": "#a855f7",
            "kitchen": "#f97316",
            "bathroom": "#06b6d4",
            "corridor": "#64748b"
        }

        for room in layout.get("rooms", []):
            x, y, w, h = room["x"], room["y"], room["width"], room["height"]
            room_type = room.get("type", "bedroom")
            fill_color = color_map.get(room_type, "#94a3b8")

            # Dessin du rectangle de la pièce
            rect = patches.Rectangle(
                (x, y), w, h,
                linewidth=2.5,
                edgecolor='#e2e8f0',
                facecolor=fill_color,
                alpha=0.65
            )
            ax.add_patch(rect)

            # Étiquette du nom et de la surface
            area = w * h
            label_text = f"{room['name']}\n{area:.1f} m²"
            ax.text(
                x + w / 2, y + h / 2, label_text,
                color='white', weight='bold', fontsize=9,
                ha='center', va='center'
            )

        plt.title(layout.get("project_title", "Plan Architectural SCoT - Archi Cam AI"), color='white', fontsize=14, pad=15)
        plt.axis('off')
        plt.tight_layout()
        plt.savefig(output_image_path, dpi=300, bbox_inches='tight', facecolor=fig.get_facecolor())
        plt.close()

        return output_image_path

if __name__ == "__main__":
    print("Moteur SpatialCoTPlanner initialisé.")
