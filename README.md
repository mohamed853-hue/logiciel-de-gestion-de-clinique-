# Al Shifa - Système de Gestion de Clinique

Système moderne et complet de gestion de clinique développé avec React, Vite, TypeScript et TailwindCSS.

## 🏥 Fonctionnalités

### Rôles et Interfaces

- **Réceptionniste** : Gestion des patients, rendez-vous, tableau de bord avec statistiques
- **Médecin** : Dossiers patients, demandes d'analyses, ordonnances, résultats
- **Gynécologue** : Spécificités obstétricales, suivi de grossesse, échographies
- **Laboratoire** : Réception des demandes, gestion des résultats (PDF, Word, images)
- **Pharmacien** : Ventes rapides, gestion du stock, ordonnances
- **Infirmier/ère** : Tâches (injections, pansements, prises de sang), constantes
- **Caissier** : Paiements, reçus, rapports financiers
- **Radiologie** : Examens (radio, échographie, CT, IRM), résultats et images
- **Urgences** : Compteur de cas urgents (simplifié)
- **Secrétaire** : Dossiers administratifs, assurances, remboursements
- **Administrateur** : Statistiques globales, gestion utilisateurs, paramètres

## 🚀 Technologies

- **Frontend** : React 18 + Vite
- **Langage** : TypeScript
- **Styling** : TailwindCSS
- **Routing** : React Router
- **Icons** : Lucide React
- **State Management** : React Context + Hooks
- **Backend** : Supabase

## 📦 Installation

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Build pour production
npm run build
```

## 🔧 Configuration Supabase

### 1. Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Notez votre URL et votre API Key

### 2. Configurer les variables d'environnement

Créez un fichier `.env` à la racine du projet :

```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_cle_anon
```

### 3. Exécuter les scripts SQL

Exécutez les scripts SQL suivants dans l'ordre dans le SQL Editor de Supabase :

1. **supabase_schema.sql** - Tables principales et utilisateurs
2. **supabase_accueil.sql** - File d'attente
3. **supabase_medecin.sql** - Module médecin
4. **supabase_medicaments.sql** - Catalogue médicaments
5. **supabase_nouveautes.sql** - Tables supplémentaires
6. **supabase_missing_tables.sql** - Tables Secrétaire et Radiologue
7. **supabase_update_patients.sql** - Mise à jour table patients (champs supplémentaires)
8. **supabase_accompaniers.sql** - Table des accompagnants (mini-dossier)

### 4. Comptes de démonstration

Après avoir exécuté les scripts SQL, vous pouvez vous connecter avec :

- **Admin** : `admin@alshifa.dz` / `admin123`
- **Médecin** : `medecin@alshifa.dz` / `med123`
- **Radiologue** : `radiologue@alshifa.dz` / `rad123`
- **Secrétaire** : `secretary@alshifa.dz` / `sec123`

## 📋 Structure des rôles

Le système supporte les rôles suivants :

- `admin` - Administrateur système
- `medecin` - Médecin généraliste
- `gynecologue` - Gynécologue
- `infirmier` - Infirmier/ère
- `pharmacien` - Pharmacien
- `pharmacien_chef` - Pharmacien chef
- `caissier` - Caissier
- `laborantin` - Laborantin
- `receptionniste` - Réceptionniste
- `radiologue` - Radiologue
- `secretary` - Secrétaire

## 📁 Structure du projet

```
src/
├── components/       # Composants réutilisables
├── contexts/         # Contextes React (Auth)
├── layouts/          # Layouts principaux
├── pages/            # Pages des tableaux de bord
├── services/         # Services Supabase
├── types/            # Types TypeScript
└── utils/            # Utilitaires
```

## 🎨 Design

Le système utilise une palette de couleurs moderne et professionnelle :

- **Primary** : Bleu à Cyan (confiance, santé)
- **Secondary** : Émeraude à Teal (succès, croissance)
- **Emergency** : Rouge à Rose (urgence, alerte)
- **Background** : Dégradé subtil de gris à bleu clair

## 📱 Responsive

L'interface est entièrement responsive et fonctionne sur :
- Desktop (1920px+)
- Laptop (1024px - 1920px)
- Tablet (768px - 1024px)
- Mobile (< 768px)

## 🔐 Sécurité

- Authentification par rôle via Supabase
- Protection des routes
- Validation des données avec TypeScript
- RLS (Row Level Security) activé sur toutes les tables

## 📝 Notes

- L'interface Urgences affiche uniquement un compteur de cas urgents
- L'intégration Supabase est configurée et prête pour la production
- Les rôles TypeScript correspondent exactement aux rôles de la base de données

## 📄 Licence

Ce projet a été développé pour Al Shifa Clinic.
