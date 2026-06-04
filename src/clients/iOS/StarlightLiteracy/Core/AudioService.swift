import AVFoundation

// baked 音频播放 · 红线：只播 baked mp3，禁 OS TTS / speechSynthesis / 欢迎语
@MainActor
final class AudioService {
    static let shared = AudioService()
    private var player: AVAudioPlayer?

    enum Kind: String { case char, phrase, soundCue }

    func url(unit: String = "unit-01", id: String, kind: Kind) -> URL? {
        Bundle.main.url(forResource: kind.rawValue, withExtension: "mp3",
                        subdirectory: "Audio/\(unit)/\(id)")
    }

    func configureForPlayback() {
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
        try? AVAudioSession.sharedInstance().setActive(true)
    }

    // 返回 baked 音频时长（秒），供认读页把「逐笔点亮」节奏对齐念音长度（音→形绑定）。
    // 现有调用忽略返回值即可，向后兼容。
    @discardableResult
    func play(id: String, kind: Kind = .char) -> TimeInterval? {
        guard let u = url(id: id, kind: kind) else { return nil }
        configureForPlayback()
        player = try? AVAudioPlayer(contentsOf: u)
        player?.prepareToPlay()
        player?.play()
        return player?.duration
    }

    func stop() { player?.stop(); player = nil }
}
