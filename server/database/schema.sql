-- ============================================
-- Ads Reward Pro - Database Schema
-- ============================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255) DEFAULT '',
    first_name VARCHAR(255) DEFAULT '',
    last_name VARCHAR(255) DEFAULT '',
    balance BIGINT DEFAULT 0,
    total_earned BIGINT DEFAULT 0,
    referral_count INT DEFAULT 0,
    daily_spins INT DEFAULT 5,
    spins_used_today INT DEFAULT 0,
    ads_today INT DEFAULT 0,
    hourly_gift_available TINYINT(1) DEFAULT 1,
    referral_code VARCHAR(50) UNIQUE,
    referred_by BIGINT DEFAULT NULL,
    language VARCHAR(10) DEFAULT 'ar',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_telegram_id (telegram_id),
    INDEX idx_referral_code (referral_code)
);

-- Activities Log
CREATE TABLE IF NOT EXISTS activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('ad', 'wheel', 'gift', 'referral', 'withdraw', 'signup') NOT NULL,
    points BIGINT DEFAULT 0,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_type (user_id, type),
    INDEX idx_created (created_at)
);

-- Daily Stats
CREATE TABLE IF NOT EXISTS daily_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    ads_watched INT DEFAULT 0,
    wheel_spins INT DEFAULT 0,
    gifts_claimed INT DEFAULT 0,
    earnings BIGINT DEFAULT 0,
    referrals INT DEFAULT 0,
    UNIQUE KEY unique_user_date (user_id, date)
);

-- Ad Watches
CREATE TABLE IF NOT EXISTS ad_watches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    reward_amount INT DEFAULT 0,
    watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wheel Spins
CREATE TABLE IF NOT EXISTS wheel_spins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    reward_amount INT DEFAULT 0,
    sector_index INT DEFAULT 0,
    spun_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gift Claims
CREATE TABLE IF NOT EXISTS gift_claims (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    gift_type ENUM('hourly', 'daily') DEFAULT 'hourly',
    reward_amount INT DEFAULT 0,
    claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount_points BIGINT NOT NULL,
    amount_stars INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL
);

-- Admin Logs
CREATE TABLE IF NOT EXISTS admin_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id BIGINT,
    action VARCHAR(100),
    target_user_id INT,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);