# Application de Gestion de Réunions

Une application web moderne pour planifier et gérer des réunions collaborativement. Trouvez facilement des créneaux qui conviennent à tous les participants, sans les tracas des échanges d'emails interminables.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node.js](https://img.shields.io/badge/Node.js-14+-green.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-blue.svg)

## 🚀 Fonctionnalités

- ✅ **Création de réunions** avec multiples propositions de créneaux
- 👥 **Invitation de participants** par email (avec ou sans compte)
- 📊 **Visualisation des disponibilités** de chaque participant
- 📆 **Import/Export de calendriers** au format ICS
- 🔔 **Notifications** pour les invitations et les confirmations
- 📱 **Interface responsive** adaptée à tous les appareils

## 🛠️ Technologies utilisées

- **Backend**: Node.js, Express.js
- **Frontend**: HTML5, CSS3, JavaScript, EJS
- **Base de données**: PostgreSQL

## 📋 Prérequis

- Node.js (v14 ou supérieur)
- PostgreSQL (v12 ou supérieur)
- npm (v6 ou supérieur)

## 🔧 Installation

1. **Cloner le dépôt**

```bash
git clone https://moule.informatique.univ-paris-diderot.fr/jinc/projet-web-2024-2025.git
cd projet-web-2024-2025
```

2. **Installer les dépendances**

```bash
npm install
```

## 🗃️ Configuration de la base de données

1. **Créer la base de données**

```bash
psql -U postgres -c "CREATE DATABASE reunion;"
```

2. **Initialiser les tables**

```bash
psql -U postgres -d reunion -f sql/init.sql
```

## 🚀 Lancement de l'application

**En développement**:

```bash
npm run dev
```

**En production**:

```bash
npm start
```

L'application sera accessible à l'adresse: [http://localhost:3000](http://localhost:3000)

## 📁 Structure du projet

```
projet-web-2024-2025/
├── config/             # Configuration (base de données, etc.)
├── controllers/        # Contrôleurs pour la logique métier
├── models/             # Modèles de données
├── public/             # Fichiers statiques (CSS, JS, images)
├── routes/             # Routes de l'application
├── sql/                # Scripts SQL
├── utils/              # Utilitaires
├── views/              # Templates EJS
├── .env                # Variables d'environnement (non versionné)
├── .gitignore          # Fichiers ignorés par Git
├── app.js              # Point d'entrée de l'application
├── package.json        # Dépendances et scripts
└── README.md           # Documentation
```

## 📄 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## ✒️ Auteurs

- **JIN Cristophe**
- **PIGET Mathéo**