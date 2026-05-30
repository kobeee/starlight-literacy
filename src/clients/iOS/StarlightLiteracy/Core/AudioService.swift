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

    func play(id: String, kind: Kind = .char) {
        guard let u = url(id: id, kind: kind) else { return }
        configureForPlayback()
        player = try? AVAudioPlayer(contentsOf: u)
        player?.prepareToPlay()
        player?.play()
    }

    func stop() { player?.stop(); player = nil }
}
