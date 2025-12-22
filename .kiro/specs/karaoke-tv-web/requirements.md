# Requirements Document

## Introduction

Xây dựng một trang web karaoke được tối ưu hóa cho Google TV và Android TV, với khả năng điều khiển từ điện thoại. Hệ thống sử dụng nguồn nhạc karaoke từ YouTube, có tính năng chấm điểm và giao diện UX/UI đẹp, dễ sử dụng với remote TV.

## Glossary

- **Karaoke_Web_App**: Ứng dụng web chính chạy trên TV
- **Mobile_Controller**: Ứng dụng web điều khiển từ điện thoại
- **Song_Library**: Thư viện bài hát karaoke từ YouTube
- **Scoring_System**: Hệ thống chấm điểm giọng hát
- **TV_Interface**: Giao diện tối ưu cho điều khiển bằng remote TV
- **Session**: Phiên karaoke kết nối giữa TV và điện thoại
- **Queue**: Danh sách bài hát chờ hát

## Requirements

### Requirement 1: Giao diện TV tối ưu cho Remote

**User Story:** As a user, I want to navigate the karaoke app easily with my TV remote, so that I can select songs without complex mouse movements.

#### Acceptance Criteria

1. THE TV_Interface SHALL display large, focusable buttons with clear visual focus states
2. WHEN a user navigates using arrow keys, THE TV_Interface SHALL move focus between elements in a logical grid pattern
3. WHEN an element receives focus, THE TV_Interface SHALL display a prominent highlight border and scale animation
4. THE TV_Interface SHALL support navigation using only 5 keys: Up, Down, Left, Right, and Enter/OK
5. WHEN the app loads, THE TV_Interface SHALL auto-focus on the most relevant action element

### Requirement 2: Thư viện bài hát từ YouTube

**User Story:** As a user, I want to search and browse karaoke songs from YouTube, so that I can access a large library of songs.

#### Acceptance Criteria

1. WHEN a user searches for a song, THE Song_Library SHALL query YouTube for karaoke versions and display results
2. THE Song_Library SHALL filter search results to prioritize videos with "karaoke" in title or description
3. WHEN displaying search results, THE Song_Library SHALL show thumbnail, song title, channel name, and duration
4. WHEN a user selects a song, THE Karaoke_Web_App SHALL load and play the YouTube video
5. THE Song_Library SHALL cache recent searches and popular songs for faster access

### Requirement 3: Hàng đợi bài hát (Queue)

**User Story:** As a user, I want to add songs to a queue, so that I can plan my karaoke session without interruption.

#### Acceptance Criteria

1. WHEN a user adds a song to queue, THE Queue SHALL append the song to the end of the list
2. THE TV_Interface SHALL display the current queue with song order, title, and thumbnail
3. WHEN the current song ends, THE Karaoke_Web_App SHALL automatically play the next song in Queue
4. WHEN a user removes a song from queue, THE Queue SHALL update immediately and shift remaining songs
5. THE Queue SHALL persist during the session and allow reordering of songs

### Requirement 4: Điều khiển từ điện thoại

**User Story:** As a user, I want to control the TV karaoke app from my phone, so that I can search and add songs more easily.

#### Acceptance Criteria

1. WHEN the TV app starts, THE Karaoke_Web_App SHALL display a QR code and session code for phone connection
2. WHEN a user scans the QR code, THE Mobile_Controller SHALL connect to the same Session as the TV
3. THE Mobile_Controller SHALL allow searching songs with full keyboard input
4. WHEN a user adds a song from phone, THE Queue on TV SHALL update in real-time
5. THE Mobile_Controller SHALL display current playing song and queue status
6. IF the connection is lost, THEN THE Mobile_Controller SHALL attempt automatic reconnection

### Requirement 5: Hệ thống chấm điểm

**User Story:** As a user, I want to receive a score after singing, so that I can track my performance and compete with friends.

#### Acceptance Criteria

1. WHEN a song starts, THE Scoring_System SHALL begin listening to microphone input
2. THE Scoring_System SHALL analyze pitch accuracy and timing during the song
3. WHEN the song ends, THE Scoring_System SHALL display a score from 0 to 100
4. THE Scoring_System SHALL show real-time feedback during singing with visual indicators
5. IF microphone access is denied, THEN THE Scoring_System SHALL display a message and allow singing without scoring

### Requirement 6: Giao diện đẹp và hiện đại

**User Story:** As a user, I want a beautiful and modern interface, so that my karaoke experience feels premium and enjoyable.

#### Acceptance Criteria

1. THE TV_Interface SHALL use a dark theme with vibrant accent colors suitable for living room viewing
2. THE TV_Interface SHALL display smooth animations for transitions and interactions
3. WHEN a song is playing, THE TV_Interface SHALL show lyrics overlay with karaoke-style highlighting
4. THE TV_Interface SHALL use large, readable fonts optimized for TV viewing distance
5. THE Mobile_Controller SHALL have a consistent design language with the TV interface

### Requirement 7: Quản lý phiên karaoke

**User Story:** As a user, I want to manage my karaoke session, so that multiple people can take turns singing.

#### Acceptance Criteria

1. THE Session SHALL support multiple phone controllers connected simultaneously
2. WHEN a new phone connects, THE Karaoke_Web_App SHALL notify on the TV screen
3. THE Session SHALL track which user added each song to the queue
4. WHEN the session ends, THE Karaoke_Web_App SHALL display a summary of songs sung and scores
5. THE Session SHALL remain active as long as the TV app is open

### Requirement 8: Hiệu suất và độ tin cậy

**User Story:** As a user, I want the app to run smoothly on my TV, so that my karaoke experience is not interrupted by lag or crashes.

#### Acceptance Criteria

1. THE Karaoke_Web_App SHALL load initial interface within 3 seconds on standard TV hardware
2. WHEN searching songs, THE Song_Library SHALL return results within 2 seconds
3. THE Karaoke_Web_App SHALL handle network interruptions gracefully without crashing
4. IF YouTube video fails to load, THEN THE Karaoke_Web_App SHALL display an error and skip to next song
5. THE Karaoke_Web_App SHALL use lazy loading for images and non-critical resources
