# Development and Testing Strategy

This document outlines the standard development and testing workflow for the FishingPond Minecraft mod project.

## 1. Development Environment & Collaboration
The project is developed using a multi-environment approach to maximize efficiency:
- **Remote / Headless Server:** Used for heavy logic implementation, architectural design, automated testing, and multi-loader build configurations.
- **Local Environment:** Used for testing the client, debugging GUI/rendering issues, and verifying visual/audio feedback.
- **Synchronization:** Changes are synchronized between the remote server and the local environment using Git version control.

## 2. Testing Strategy
To minimize the need for manual client launches and visual debugging, we rely heavily on automated testing where applicable.

### 2.1. Automated Testing (Primary approach)
- **GameTest Framework:** Used for testing in-world mechanics, entity behavior, block interactions, and Redstone logic. Tests are run headlessly on a dedicated test server during the build process.
- **Unit Testing (JUnit/Mockito):** Used for pure Java logic, data parsers, math utilities, and algorithms that do not directly depend on Minecraft's core engine state.

### 2.2. Manual Testing (Secondary approach)
- **GUI and Rendering:** UI layouts, rendering logic, particles, and visual effects are tested manually by running the client (`./gradlew runClient`) in the local environment.
- **UX Verification:** Final gameplay feel and user experience checks.

## 3. Workflow
1. Implement core features and write accompanying GameTests / Unit tests on the remote server.
2. Run `./gradlew build` to ensure all tests pass in the headless environment.
3. Commit and push the changes.
4. Pull the changes locally.
5. Launch the client locally to verify rendering and GUI elements, making adjustments as needed.
