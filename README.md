# 🏥 Physiotherapy Management System

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.8+-blue.svg" alt="Python">
  <img src="https://img.shields.io/badge/Django-4.x-green.svg" alt="Django">
  <img src="https://img.shields.io/badge/React-19.0-blue.svg" alt="React">
  <img src="https://img.shields.io/badge/PostgreSQL-12+-blue.svg" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Material--UI-5.x-blue.svg" alt="MUI">
  <img src="https://img.shields.io/badge/Status-Completed-success.svg" alt="Status">
</p>

## 📋 Project Overview

This is a physiotherapy clinic management system designed to optimize patient management, appointment scheduling, treatment planning, and patient record management. The system provides comprehensive patient information management, appointment scheduling management, treatment plan tracking and other features to help physiotherapy clinics improve operational efficiency.

### 🎯 Main Challenges

Physiotherapy clinics face several management challenges:

- ❌ Scattered patient records and medical history management
- ❌ Complex appointment scheduling with frequent conflicts
- ❌ Lack of systematic treatment plan tracking and management
- ❌ Difficulty in querying and analyzing patient treatment history

### ✨ Our Solution

Through a comprehensive information management system:

- ✅ **Complete Patient Records**: Centralized management of patient medical records and treatment history
- ✅ **Smart Appointment System**: Flexible scheduling with conflict detection
- ✅ **Treatment Plan Management**: Create and track personalized treatment plans
- ✅ **Permission Management System**: Role-based access control for different user types

---

## 🌟 Core Features

### 📅 Appointment Management System

- Flexible appointment creation, modification, and cancellation
- Therapist schedule management and unavailable time slots
- Appointment status tracking (pending/confirmed/completed/cancelled)
- Automatic conflict detection and reminders

### 👥 Patient Information Management

- Complete patient profile management
- Medical records and viewing
- Treatment history tracking

### 💊 Treatment Plan Management

- Personalized treatment plan creation
- Treatment templates and exercise library
- Treatment progress tracking and assessment
- Exercise assignment and adjustment

### 🏋️ Exercise Management

- Exercise library (categorized by body parts)
- Exercise difficulty levels and instructions
- Demo video management
- Customizable exercise routines

### 👤 User Account Management

- Multi-role permission control (Admin/Therapist/Patient)
- User profile management
- Password change and account settings

### 🔔 Notification System

- Appointment reminders
- System message notifications
- Real-time status updates

---

## 🏗️ Technology Stack

### Backend

- **Framework**: Django 4.x + Django REST Framework
- **Database**: PostgreSQL / SQLite
- **Libraries**: Django-CORS, Django REST Framework, Python standard libraries
- **Authentication**: Django's built-in authentication system

### Frontend

- **Framework**: React 19.0
- **UI Library**: Material-UI (MUI) 5.x
- **State Management**: React Hooks
- **Charts**: Recharts 3.x
- **Calendar**: FullCalendar, React Big Calendar

### DevOps

- **Version Control**: Git
- **Package Management**: pip (Python), npm (JavaScript)

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │  Appointment │  │   Patient    │      │
│  │              │  │   Calendar   │  │     Info     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Treatment  │  │   Exercise   │  │     Admin    │      │
│  │  Management  │  │   Library    │  │   Controls   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↕ REST API
┌─────────────────────────────────────────────────────────────┐
│                     Backend (Django)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │     API      │  │   Business   │  │   Database   │      │
│  │   Endpoints  │  │    Logic     │  │    Models    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Core Services                                │  │
│  │  ┌──────────────┐  ┌──────────────────────────┐   │  │
│  │  │   Patient    │  │   Treatment & Appointment│   │  │
│  │  │  Management  │→ │      Management          │   │  │
│  │  └──────────────┘  └──────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎓 Functional Modules

### 1. User Management Module

- User authentication and authorization
- Multi-role permission control
- User profile management

### 2. Appointment System Module

- Appointment CRUD operations
- Schedule conflict detection
- Status management

### 3. Patient Information Management

- Patient profile management
- Medical records
- Treatment history

### 4. Treatment Plan Management

- Treatment plan creation
- Template management
- Progress tracking

### 5. Exercise Management

- Exercise library management
- Difficulty settings
- Demo videos

### 6. Dashboard & Reports

- Data overview
- Quick operations
- Patient statistics

### 7. Notification System

- Real-time notifications
- Appointment reminders

---

## 🚀 Getting Started

### System Requirements

- Python 3.8+
- Node.js 14+
- PostgreSQL 12+ (or SQLite for development)

### Installation Steps

#### 1. Clone the Repository

```bash
git clone https://github.com/ChaiJiaYou/FinalYearProjectPhysiotherapy.git
cd physiotherapy-system
```

#### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start server
python manage.py runserver
```

### System Capabilities

| Feature                | Status      | Details                          |
| ---------------------- | ----------- | -------------------------------- |
| **Patient Management** | ✅ Complete | Full profile and medical records |
| **Appointment System** | ✅ Complete | Conflict detection and reminders |
| **Treatment Plans**    | ✅ Complete | Customizable and trackable       |
| **User Roles**         | ✅ Complete | Admin, Therapist, Patient roles  |
| **Dashboard**          | ✅ Complete | Real-time data visualization     |
| **REST API**           | ✅ Complete | RESTful API for all operations   |

### Technical Achievements

- Complete REST API with proper authentication
- Multi-role permission system
- Database design with PostgreSQL
- Responsive React frontend with Material-UI
- Real-time notification system
- Comprehensive error handling

### Project Structure

```
physiotherapy-system/
├── backend/              # Django backend
│   ├── api/              # Main application
│   │   ├── models.py     # Data models
│   │   ├── views.py      # Views and APIs
│   │   ├── services/     # Business logic
│   │   └── tests/        # Tests
│   └── physiotherapy/    # Project settings
├── frontend/             # React frontend
│   └── src/
│       └── components/   # React components
├── docs/                 # Project documentation
└── README.md             # This file
```

### Running Scipts

```Terminal
# Backend Scripts
cd backend
venv/scripts/activate
python manage.py runserver


# Frontend Scripts
cd backend
venv/scripts/activate
cd ../frontend
npm start

```

---

---

## 👨‍💻 Author

**[Chai Jia You]**

- School: [TARUMT Penang]
- Major: [Software Engineering]
- Project Type: Final Year Project
- Year: 2024/2025

---

## 🙏 Acknowledgments

- Django and React communities
- Material-UI design system
- PostgreSQL community
- All contributors and peers

---

<p align="center">
  Made with ❤️ for better physiotherapy management
</p>
