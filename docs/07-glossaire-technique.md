# 07 - Glossaire des Termes Techniques

### **BIM (Building Information Modeling)**
Maquette Numérique du Bâtiment. Modèle 3D enrichi avec des métadonnées d'ingénierie (matériaux, résistances, coûts).

### **IFC (Industry Foundation Classes)**
Format d'échange BIM normalisé ISO 16739. Permet l'interopérabilité entre Revit, ArchiCAD, SketchUp, etc.

### **Property Sets (Psets)**
Ensembles de propriétés attachés aux éléments IFC. Exemple : `Pset_WallCommon` contient l'épaisseur, le matériau, la résistance au feu d'un mur.

### **Magic Bytes**
Les premiers octets d'un fichier qui identifient son format réel. Exemple : `%PDF` pour PDF, `d0cf11e0` pour Revit.

### **SHA-256**
Fonction de hachage cryptographique qui génère une empreinte unique d'un fichier. Utilisée pour le cache de conversion.

### **BAEL 91**
Béton Armé aux États Limites. Norme de calcul des structures en béton armé, adaptée pour l'Afrique francophone et le Cameroun.

### **POS (Plan d'Occupation des Sols)**
Règlement d'urbanisme définissant les règles de construction par zone (hauteur max, CES, reculs, etc.).

### **CES (Coefficient d'Emprise au Sol)**
Ratio entre la surface au sol du bâtiment et la surface totale de la parcelle. Exemple : CES 0.4 = max 40% de la parcelle constructible.

### **DQE (Décompte Quantitatif Estimatif)**
Document officiel listant les quantités de matériaux et la ventilation financière par lots (gros œuvre, finitions, etc.).

### **Mercuriale MINMAP**
Barème officiel des prix des matériaux et prestations BTP publié par le Ministère des Marchés Publics du Cameroun.

### **Open CASCADE**
Moteur de calcul géométrique 3D open-source utilisé par ifcopenshell pour trianguler les solides IFC.

### **Tessellation**
Conversion d'une surface courbe (NURBS, B-Spline) en un maillage de triangles pour affichage 3D.
