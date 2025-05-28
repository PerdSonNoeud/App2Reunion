# 📅 Application de Gestion de Réunions

Une application web moderne pour planifier et gérer des réunions collaborativement. Trouvez facilement des créneaux qui conviennent à tous les participants, sans les tracas des échanges d'emails interminables.

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/jinc/projet-web-2024-2025)
[![Node.js](https://img.shields.io/badge/Node.js-14+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-blue.svg)](https://www.postgresql.org/)

## 🚀 Fonctionnalités

- ✅ **Création de réunions** avec multiples propositions de créneaux
- 👥 **Invitation de participants** par email (avec ou sans compte)
- 📊 **Visualisation des disponibilités** de chaque participant
- 📆 **Import/Export de calendriers** au format ICS
- 🔔 **Notifications** pour les invitations et les confirmations
- 📱 **Interface responsive** adaptée à tous les appareils

## 🛠️ Technologies utilisées

| Type | Technologies |
|------|-------------|
| **Backend** | Node.js, Express.js |
| **Frontend** | HTML5, CSS3, JavaScript, EJS |
| **Base de données** | PostgreSQL |

## 📋 Prérequis

- Node.js (v14 ou supérieur)
- PostgreSQL (v12 ou supérieur)
- npm (v6 ou supérieur)

## 🔧 Installation

1. **Cloner le dépôt**

```bash
git clone https://github.com/PerdSonNoeud/App2Reunion.git
cd App2Reunion
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

3. **Configurer les variables d'environnement**

Créez un fichier `.env` à la racine du projet avec ces variables:

```env
DB_NAME='reunion'
DB_USER='postgres'
DB_PASSWORD=your_password
DB_HOST='localhost'
DB_PORT=5432
EMAIL_SERVICE=your_email_service
EMAIL_USER=your_email
EMAIL_PASSWORD=your_app_password
BASE_URL='http://localhost:3000'
```

> **Note:** Pour `EMAIL_PASSWORD`, générez un mot de passe d'application via [Google Account](https://myaccount.google.com/apppasswords) si vous utilisez Gmail.

## 🚀 Lancement de l'application

**En développement:**

```bash
npm run dev
```

**En production:**

```bash
npm start
```

L'application sera accessible à l'adresse: [http://localhost:3000](http://localhost:3000)

## 📁 Structure du projet

```bash
App2Reunion/
├── config/             # Configuration (base de données, etc.)
├── public/             # Fichiers statiques (CSS, JS, images)
├── routes/             # Routes de l'application
├── sql/                # Scripts SQL
├── test/               # Tests de l'application
├── views/              # Templates EJS
├── .env                # Variables d'environnement (non versionné)
├── .gitignore          # Fichiers ignorés par Git
├── app.js              # Point d'entrée de l'application
├── package.json        # Dépendances et scripts
└── README.md           # Documentation
```

## 👨‍💻 Auteurs

- **JIN Cristophe** - [GitHub](https://github.com/PerdSonNoeud)
- **PIGET Mathéo** - [GitHub](https://github.com/Matheo-Piget)
