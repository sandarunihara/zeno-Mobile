<div align="center">

# ⚡ ZENO
### *Mindful Productivity, Energy-Aware Scheduling & AI Life Optimization*

[![React Native](https://img.shields.io/badge/React_Native-0.81.5-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK_54-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.x-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Spring Cloud](https://img.shields.io/badge/Spring_Cloud-Microservices-6DB33F?style=for-the-badge&logo=spring&logoColor=white)](https://spring.io/projects/spring-cloud)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Groq AI](https://img.shields.io/badge/Groq-Llama_3.3_70B-F05A28?style=for-the-badge)](https://groq.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

<br/>

**Zeno** is a full-stack, AI-powered personal wellness and productivity system. Built with an **Apple Human Interface Guidelines (HIG)** aesthetic, Zeno bridges the gap between task management and human energy limits. It adapts daily schedules to your current social and emotional battery, parses messy voice thoughts into structured micro-steps using Groq AI, sniffs out hidden recurring charges via automated Gmail invoice analysis, and infers sleep health without requiring expensive wearable devices.

</div>

---

## 📑 Table of Contents

- [Key Highlights](#-key-highlights)
- [Architecture Overview](#-architecture-overview)
- [Repository Structure](#-repository-structure)
- [Tech Stack](#-tech-stack)
- [Microservices Breakdown](#-microservices-breakdown)
- [Mobile Client Features](#-mobile-client-features)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Database Setup](#1-database-setup)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
- [Environment Configuration](#-environment-configuration)
- [API Reference](#-api-reference)
- [Contributing & License](#-contributing--license)

---

## ✨ Key Highlights

### 🎙️ 1. Voice AI "Brain Dump"
- Record spontaneous ideas, rambling thoughts, and rapid to-do lists using **Expo Speech Recognition**.
- High-speed AI parsing powered by **Groq Llama 3.3 70B** automatically extracts actionable tasks, estimated durations, priorities, deadlines, and deconstructs overwhelming tasks into atomic **micro-steps**.

### ⚡ 2. Adaptive Energy & Social Battery
- Log mood and emotional capacity scores on a sleek, interactive scale.
- An empathetic scheduling engine adjusts your daily agenda based on your current state—offering a **"Keep it light"** mode when energy is depleted and prioritizing high-focus work when at peak capacity.

### 👻 3. Subscription Ghostbuster
- Automatically inspects transactional emails via **Google Gmail OAuth API**.
- Employs zero-shot LLM parsing to identify hidden, forgotten, or creeping recurring subscriptions (Netflix, Spotify, Cloud providers, Gyms), logging costs, renewal dates, and billing cycles to prevent financial leaks.

### 📅 4. Google Calendar Two-Way Sync & Free-Time Engine
- Seamlessly pulls events from Google Calendar and projects them alongside local tasks.
- Intelligently calculates real-time **free time slots** throughout the day to suggest ideal study or work blocks.

### 🌙 5. Wearable-Free Sleep Inference
- Calculates sleep duration and sleep quality using mathematical device event inference (`SUSPENDED` / `RESUMED` states, screen timeouts, activity pauses).
- Provides actionable sleep metrics and weekly trend charts without requiring a smartwatch.

### 🎨 6. Minimalist iOS Design
- Ultra-clean aesthetic crafted for mental clarity: pure OLED blacks, crisp light-mode surfaces, subtle spring physics, pill-shaped interactions, and NativeWind Tailwind styling.

---

## 🏗️ Architecture Overview

```
                      ┌──────────────────────────────────────┐
                      │          Zeno Mobile Client          │
                      │  (React Native / Expo SDK 54 / TS)   │
                      └──────────────────┬───────────────────┘
                                         │ HTTP / REST (JWT)
                                         ▼
                      ┌──────────────────────────────────────┐
                      │       Spring Cloud API Gateway       │
                      │            (Port: 8080)              │
                      └──────────┬────────────────┬──────────┘
                                 │                │
            ┌────────────────────┘                └────────────────────┐
            ▼                                                          ▼
┌─────────────────────────┐                                ┌─────────────────────────┐
│       Auth Service      │                                │       Core Service      │
│       (Port: 8081)      │                                │       (Port: 8082)      │
├─────────────────────────┤                                ├─────────────────────────┤
│ • User Registration     │                                │ • Smart Task Engine     │
│ • JWT Tokens & Refresh  │                                │ • Brain Dump AI Parsing │
│ • Google OAuth Exchange │                                │ • Sleep Inference       │
│ • Profile Management    │                                │ • Subscription Scanner  │
└───────────┬─────────────┘                                │ • Social Battery / Mood │
            │                                              └───────────┬─────────────┘
            │                                                          │
            ├───────────────┐                          ┌───────────────┤
            ▼               ▼                          ▼               ▼
      ┌───────────┐   ┌───────────┐              ┌───────────┐   ┌───────────┐
      │  Postgres │   │  Google   │              │  Postgres │   │  Groq AI  │
      │ (Auth DB) │   │ OAuth API │              │ (Core DB) │   │(Llama 3.3)│
      └───────────┘   └───────────┘              └───────────┘   └───────────┘
                                ▲                      ▲
                                └──────────┬───────────┘
                                           │
                            ┌──────────────┴──────────────┐
                            │    Eureka Discovery Server  │
                            │         (Port: 8761)        │
                            └─────────────────────────────┘
```

---

## 📁 Repository Structure

```
zeno-Mobile/
├── zeno-backend/                       # Spring Boot Microservices Root
│   ├── pom.xml                         # Aggregator Maven POM
│   ├── start-backend-4-terminals.bat   # Automated multi-window launcher
│   ├── discovery-server/               # Eureka Service Registry (Port 8761)
│   ├── api-gateway/                    # Spring Cloud Gateway (Port 8080)
│   ├── auth-service/                   # JWT Auth & Google Token Service (Port 8081)
│   └── core-service/                   # Domain Logic, Tasks, AI, Health (Port 8082)
│
├── zeno-frontend/                      # React Native + Expo Mobile Application
│   ├── src/
│   │   ├── api/                        # Axios HTTP client with auto 401 token refresh
│   │   ├── components/                 # Reusable iOS-style buttons, inputs, modals
│   │   ├── navigation/                 # Native Stack & Bottom Tab Navigators
│   │   ├── screens/                    # Dashboard, Ghostbuster, Health, Auth, Onboarding
│   │   ├── store/                      # AuthContext & State management
│   │   └── theme/                      # Dynamic Light / Dark mode theme tokens
│   ├── App.tsx                         # Root Application wrapper
│   ├── app.json                        # Expo configuration
│   └── tailwind.config.js              # NativeWind Tailwind styles
└── README.md
```

---

## 💻 Tech Stack

### Mobile Frontend
- **Framework**: React Native 0.81 (Expo SDK 54)
- **Language**: TypeScript
- **Styling**: NativeWind (TailwindCSS v3) + React Native StyleSheet
- **Navigation**: React Navigation v7 (Native Stack & Bottom Tabs)
- **Security**: `expo-secure-store` (Hardware-backed encrypted storage for JWTs)
- **Audio & Voice**: `expo-speech-recognition`
- **Icons & Animations**: `lucide-react-native`, `react-native-reanimated`

### Backend Microservices
- **Framework**: Spring Boot 3.x, Spring Cloud 2023.x
- **Service Discovery**: Spring Cloud Netflix Eureka
- **API Gateway**: Spring Cloud Gateway (MVC routing)
- **Security**: Spring Security 6 with JJWT (HMAC-SHA256 access & refresh tokens)
- **Database / ORM**: PostgreSQL, Spring Data JPA, Hibernate
- **AI Engine**: Groq API integration with `llama-3.3-70b-versatile`
- **External APIs**: Google OAuth 2.0, Gmail REST API, Google Calendar API v3

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18+ and `npm`
- **Java Development Kit (JDK)**: OpenJDK 17 or 21
- **Maven**: 3.8+ (or use included `mvnw`)
- **PostgreSQL**: Running locally on port `5432`
- **Expo Go App** (on your physical iOS/Android device) or an **Android/iOS Emulator**

---

### 1. Database Setup

Create two separate PostgreSQL databases for service isolation:

```sql
CREATE DATABASE zeno_auth_db;
CREATE DATABASE zeno_core_db;
```

---

### 2. Backend Setup

#### Option A: One-Click Startup (Windows)
Run the automated launcher script from the backend directory:
```bash
cd zeno-backend
.\start-backend-4-terminals.bat
```
*This starts Discovery (8761), Auth (8081), Core (8082), and Gateway (8080) in four dedicated terminal windows.*

#### Option B: Manual Startup
Open 4 terminal windows and run each service in this exact order:

```bash
# 1. Discovery Server (Port 8761)
cd zeno-backend/discovery-server
./mvnw spring-boot:run

# 2. Auth Service (Port 8081)
cd zeno-backend/auth-service
./mvnw spring-boot:run

# 3. Core Service (Port 8082)
cd zeno-backend/core-service
./mvnw spring-boot:run

# 4. API Gateway (Port 8080)
cd zeno-backend/api-gateway
./mvnw spring-boot:run
```

---

### 3. Frontend Setup

1. **Install Dependencies**:
   ```bash
   cd zeno-frontend
   npm install
   ```

2. **Configure Environment**:
   Create a `.env` file in `zeno-frontend`:
   ```env
   EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
   ```
   > *Note for physical devices or Android emulators:* Replace `localhost` with your machine's LAN IP (e.g., `http://192.168.1.100:8080`) or `http://10.0.2.2:8080` for Android Studio emulator.

3. **Launch the Development Server**:
   ```bash
   npm start
   ```
   - Press **`a`** to launch Android Emulator
   - Press **`i`** to launch iOS Simulator
   - Scan the QR code using the **Expo Go** mobile app

---

## ⚙️ Environment Configuration

### Backend Credentials
Configure your external API secrets in:
- `zeno-backend/auth-service/src/main/resources/application.yml`
- `zeno-backend/core-service/src/main/resources/application.yml`

```yaml
google:
  client:
    id: "YOUR_GOOGLE_CLIENT_ID"
    secret: "YOUR_GOOGLE_CLIENT_SECRET"

groq:
  api:
    key: "YOUR_GROQ_API_KEY"
    url: "https://api.groq.com/openai/v1/chat/completions"
```

---

## 🔌 API Reference

All requests route through the **API Gateway** on `http://localhost:8080`.

### Auth Service (`/api/auth`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Register a new user |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT access & refresh tokens |
| `POST` | `/api/auth/refresh-token` | Renew expired access token |
| `POST` | `/api/auth/connect-gmail` | Link user's Google account for Gmail/Calendar sync |
| `GET` | `/api/auth/me` | Fetch user profile & wellness targets |
| `PUT` | `/api/auth/me` | Update height, weight, sleep targets, and preferences |

### Core Tasks & AI (`/api/core/tasks`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/core/tasks/dashboard` | Smart dashboard with energy score & suggested tasks |
| `POST` | `/api/core/tasks/ai-transcript` | Convert speech transcript into micro-step tasks via Groq |
| `POST` | `/api/core/tasks/manual` | Create a custom task manually |
| `GET` | `/api/core/tasks/all` | Fetch all user tasks |
| `GET` | `/api/core/tasks/{id}` | Get task details with atomic micro-steps |
| `POST` | `/api/core/tasks/completetask/{id}`| Mark task complete |
| `GET` | `/api/core/tasks/freetime` | Calculate available free time intervals today |
| `POST` | `/api/core/tasks/sync-calendar` | Trigger Google Calendar synchronization |

### Mood & Social Battery (`/api/core/mood`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/core/mood/create/{mood}/{isLight}` | Record energy battery (0-100) and light-mode preference |
| `GET` | `/api/core/mood/latest` | Retrieve current social battery status |

### Subscription Ghostbuster (`/api/core/sub`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/core/sub/user` | List all discovered recurring subscriptions and renewals |

### Health & Sleep Tracking (`/api/core/health`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/core/health/sleep-sync` | Ingest device state events & infer sleep cycle |
| `GET` | `/api/core/health/sleep/latest` | Retrieve latest sleep duration & quality score |
| `GET` | `/api/core/health/sleep/weekly` | Retrieve 7-day sleep trend history |
| `POST` | `/api/core/health/steps` | Record daily step count |
| `GET` | `/api/core/health/steps/today` | Fetch today's step count |

---

## 🛡️ Security Architecture
- **Stateless Authentication**: Uses cryptographic JWT tokens with short expiry windows for access and long-lived refresh tokens.
- **Hardware-Backed Storage**: Mobile client uses `expo-secure-store` to isolate tokens from standard device storage.
- **Microservice Isolation**: Core service validates tokens internally via Eureka inter-service communication through `AuthServiceClient`.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Crafted with care by <a href="https://github.com/sandarunihara">Sandaru Nihara</a>. Built for focused minds and balanced lives.</sub>
</div>
