# Implementation Plan: Karaoke TV Web App

## Overview

Triển khai ứng dụng web karaoke tối ưu cho TV với khả năng điều khiển từ điện thoại. Sử dụng Next.js cho frontend, Node.js + Socket.io cho backend, và YouTube làm nguồn nhạc.

## Tasks

- [x] 1. Khởi tạo project và cấu trúc cơ bản
  - [x] 1.1 Tạo Next.js project với TypeScript và Tailwind CSS
    - Cấu hình next.config.js cho TV optimization
    - Setup Tailwind với custom theme (dark mode, TV-friendly colors)
    - _Requirements: 6.1_
  - [x] 1.2 Tạo cấu trúc thư mục và shared types
    - Định nghĩa interfaces: Song, QueueItem, Session, ScoreData
    - Setup path aliases trong tsconfig
    - _Requirements: 2.3, 3.1, 5.3_
  - [ ]* 1.3 Setup testing framework với Vitest và fast-check
    - Cấu hình vitest.config.ts
    - Tạo test utilities và generators cơ bản
    - _Requirements: Testing Strategy_

- [-] 2. Implement Queue Management
  - [x] 2.1 Tạo Queue store với Zustand
    - Implement add, remove, reorder functions
    - Implement getNext, getCurrent functions
    - _Requirements: 3.1, 3.3, 3.4, 3.5_
  - [ ]* 2.2 Property test: Queue add preserves order
    - **Property 1: Queue Add Preserves Order and Increases Length**
    - **Validates: Requirements 3.1**
  - [ ]* 2.3 Property test: Queue remove maintains order
    - **Property 2: Queue Remove Maintains Remaining Order**
    - **Validates: Requirements 3.4**
  - [ ]* 2.4 Property test: Queue reorder preserves items
    - **Property 3: Queue Reorder Preserves All Items**
    - **Validates: Requirements 3.5**

- [x] 3. Implement TV Navigation System
  - [x] 3.1 Tạo NavigationGrid component và hook
    - Implement useTVNavigation hook với keyboard event handling
    - Support Up, Down, Left, Right, Enter keys only
    - _Requirements: 1.2, 1.4_
  - [x] 3.2 Tạo FocusableButton component
    - Large touch target, clear focus states
    - Scale animation on focus
    - _Requirements: 1.1, 1.3_
  - [ ]* 3.3 Property test: Grid navigation logic
    - **Property 4: Grid Navigation with Arrow Keys**
    - **Validates: Requirements 1.2, 1.4**

- [x] 4. Checkpoint - Core logic tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement YouTube Search Integration
  - [x] 5.1 Tạo YouTube API service
    - Setup YouTube Data API client
    - Implement search function với karaoke filter
    - _Requirements: 2.1, 2.2_
  - [x] 5.2 Implement search result caching
    - Cache recent searches in memory
    - Cache popular songs
    - _Requirements: 2.5_
  - [ ]* 5.3 Property test: Search prioritizes karaoke
    - **Property 5: Search Results Prioritize Karaoke Videos**
    - **Validates: Requirements 2.2**
  - [ ]* 5.4 Property test: Search cache round-trip
    - **Property 7: Search Cache Round-Trip**
    - **Validates: Requirements 2.5**

- [x] 6. Implement Backend Server với WebSocket
  - [x] 6.1 Setup Express + Socket.io server
    - Tạo server entry point
    - Configure CORS cho TV và mobile clients
    - _Requirements: 4.1, 4.2_
  - [x] 6.2 Implement Session management
    - Create session với unique code
    - Join session by code
    - Track connected clients
    - _Requirements: 4.1, 4.2, 7.1_
  - [x] 6.3 Implement WebSocket events
    - Queue sync events (add, remove, update)
    - Song playback events (started, ended)
    - Connection events (joined, disconnected)
    - _Requirements: 4.4, 7.2_
  - [ ]* 6.4 Property test: Session multi-connection
    - **Property 10: Session Multi-Connection Support**
    - **Validates: Requirements 7.1**
  - [ ]* 6.5 Property test: Queue item attribution
    - **Property 11: Queue Item User Attribution**
    - **Validates: Requirements 7.3**

- [x] 7. Checkpoint - Backend integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Build TV App UI
  - [x] 8.1 Tạo HomeScreen component
    - Display QR code và session code
    - Quick action buttons (Search, Queue, Popular)
    - Now playing preview
    - _Requirements: 4.1, 1.1, 1.5_
  - [x] 8.2 Tạo SearchScreen component
    - On-screen keyboard với TV navigation
    - Search results grid
    - Recent searches
    - _Requirements: 2.1, 2.3, 1.2_
  - [x] 8.3 Tạo QueueScreen component
    - Current song display
    - Queue list với reorder capability
    - _Requirements: 3.2, 3.5_
  - [x] 8.4 Tạo PlayingScreen component
    - YouTube player embed
    - Song info overlay
    - Score display area
    - _Requirements: 2.4, 6.3_
  - [ ]* 8.5 Property test: TV font size minimum
    - **Property 14: TV Font Size Minimum**
    - **Validates: Requirements 6.4**

- [x] 9. Build Mobile Controller UI
  - [x] 9.1 Tạo ConnectScreen component
    - QR scanner integration
    - Manual code input
    - _Requirements: 4.2_
  - [x] 9.2 Tạo ControllerScreen component
    - Search bar với native keyboard
    - Search results list
    - Add to queue button
    - _Requirements: 4.3, 4.4_
  - [x] 9.3 Tạo Mobile QueueScreen
    - View current queue
    - Now playing info
    - _Requirements: 4.5_

- [x] 10. Implement Real-time Sync
  - [x] 10.1 Integrate Socket.io client trong TV app
    - Connect to server on app load
    - Handle queue updates
    - Handle connection events
    - _Requirements: 4.4, 7.2_
  - [x] 10.2 Integrate Socket.io client trong Mobile app
    - Connect with session code
    - Send queue add/remove events
    - Receive state updates
    - _Requirements: 4.4, 4.6_
  - [ ]* 10.3 Property test: Mobile-TV sync
    - **Property 8: Mobile-TV Queue Synchronization**
    - **Validates: Requirements 4.4, 4.5**

- [x] 11. Checkpoint - Full app integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement Scoring System
  - [x] 12.1 Setup Web Audio API cho microphone input
    - Request microphone permission
    - Create audio context và analyzer
    - _Requirements: 5.1, 5.5_
  - [x] 12.2 Implement pitch detection
    - Integrate pitchfinder library
    - Analyze pitch accuracy
    - _Requirements: 5.2_
  - [x] 12.3 Implement score calculation
    - Calculate final score 0-100
    - Real-time feedback generation
    - _Requirements: 5.3, 5.4_
  - [ ]* 12.4 Property test: Score range invariant
    - **Property 9: Score Range Invariant**
    - **Validates: Requirements 5.3**

- [x] 13. Implement Auto-play và Session Summary
  - [x] 13.1 Implement auto-play next song
    - Detect song end event
    - Automatically load next from queue
    - _Requirements: 3.3_
  - [x] 13.2 Implement session summary
    - Track completed songs và scores
    - Display summary on session end
    - _Requirements: 7.4_
  - [ ]* 13.3 Property test: Auto-play next
    - **Property 12: Auto-Play Next Song on End**
    - **Validates: Requirements 3.3**

- [x] 14. Error Handling và Polish
  - [x] 14.1 Implement network error handling
    - WebSocket reconnection logic
    - YouTube load failure handling
    - _Requirements: 8.3, 8.4_
  - [x] 14.2 Implement lazy loading
    - Lazy load images
    - Code splitting cho screens
    - _Requirements: 8.5_
  - [x] 14.3 Add animations và transitions
    - Focus animations
    - Screen transitions
    - _Requirements: 6.2_

- [x] 15. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all requirements are met
  - Test on actual TV device if possible

## Notes

- Tasks marked with `*` are optional property-based tests
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests use fast-check library với minimum 100 iterations
- Focus on TV UX first, then mobile controller
