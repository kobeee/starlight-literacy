import SwiftUI

// 学习舞台顶栏：返回 + 标题 + 4 步进度（认读→认字→跟读→写）+ 当前字
struct StageTopBar: View {
    @EnvironmentObject var model: AppModel
    let title: String
    let step: Int          // 1=认读 2=认字 3=跟读 4=写
    let char: StarChar
    var onBack: (() -> Void)? = nil

    var body: some View {
        HStack(spacing: Theme.S.s3) {
            Button { (onBack ?? { model.go(.unit) })() } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(Theme.textSecondary)
                    .frame(width: 40, height: 40)
                    .background(Circle().fill(Theme.cardWarm))
                    .overlay(Circle().stroke(Theme.lineSoft, lineWidth: 1))
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.system(size: 17, weight: .bold)).foregroundStyle(Theme.textPrimary)
                HStack(spacing: 5) {
                    ForEach(1...4, id: \.self) { i in
                        Capsule()
                            .fill(i <= step ? char.color.deep : Theme.lineSoft)
                            .frame(width: i == step ? 18 : 10, height: 5)
                    }
                }
            }
            Spacer()
            HStack(spacing: 6) {
                Text(char.char).font(.hanzi(22)).foregroundStyle(Theme.textPrimary)
                Text(char.pinyin).font(.pinyin(13)).foregroundStyle(char.color.deep)
            }
            .padding(.horizontal, 12).padding(.vertical, 6)
            .background(Capsule().fill(char.color.soft))
        }
        .padding(.horizontal, Theme.S.s4)
        .padding(.vertical, Theme.S.s3)
        .background(Theme.paperCream)
    }
}

// 底部锁定 CTA（mh5v2 .docked-cta 同源，解决"继续按钮乱漂"）
struct DockedCTA: View {
    let title: String
    var enabled: Bool = true
    var secondaryTitle: String? = nil
    var onSecondary: (() -> Void)? = nil
    let action: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            Divider().overlay(Theme.lineSoft)
            HStack(spacing: Theme.S.s3) {
                if let s = secondaryTitle {
                    Button(action: { onSecondary?() }) { Text(s) }.buttonStyle(GhostCTA()).frame(maxWidth: 130)
                }
                Button(action: { if enabled { action() } }) { Text(title) }
                    .buttonStyle(GoldCTA(enabled: enabled))
                    .disabled(!enabled)
            }
            .padding(.horizontal, Theme.S.s4)
            .padding(.top, Theme.S.s3)
            .padding(.bottom, Theme.S.s2)
        }
        .background(Theme.paperCream.opacity(0.98))
    }
}

// 简易栏标题
struct PageTopBar: View {
    let title: String
    var subtitle: String? = nil
    var onBack: (() -> Void)? = nil
    var trailing: AnyView? = nil
    var body: some View {
        HStack(spacing: Theme.S.s3) {
            if let onBack {
                Button(action: onBack) {
                    Image(systemName: "chevron.left").font(.system(size: 17, weight: .bold))
                        .foregroundStyle(Theme.textSecondary)
                        .frame(width: 40, height: 40)
                        .background(Circle().fill(Theme.cardWarm))
                        .overlay(Circle().stroke(Theme.lineSoft, lineWidth: 1))
                }
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.system(size: 20, weight: .bold)).foregroundStyle(Theme.textPrimary)
                if let subtitle { Text(subtitle).font(.system(size: 13)).foregroundStyle(Theme.textTertiary) }
            }
            Spacer()
            if let trailing { trailing }
        }
        .padding(.horizontal, Theme.S.s4)
        .padding(.vertical, Theme.S.s3)
    }
}

// 星星行
struct StarRow: View {
    let count: Int          // 0~3
    var size: CGFloat = 20
    var body: some View {
        HStack(spacing: 3) {
            ForEach(0..<3, id: \.self) { i in
                Image(systemName: i < count ? "star.fill" : "star")
                    .font(.system(size: size))
                    .foregroundStyle(i < count ? Theme.honeyGold : Theme.lineSoft)
            }
        }
    }
}

// 字大圆牌
struct CharMedallion: View {
    let char: StarChar
    var diameter: CGFloat = 96
    var locked: Bool = false
    var body: some View {
        ZStack {
            Circle().fill(locked ? Theme.lockedSoft : char.color.soft)
            Circle().stroke(locked ? Theme.lockedDeep.opacity(0.3) : char.color.deep.opacity(0.4), lineWidth: 2)
            if locked {
                Image(systemName: "lock.fill").font(.system(size: diameter * 0.28)).foregroundStyle(Theme.lockedDeep)
            } else {
                Text(char.char).font(.hanzi(diameter * 0.5)).foregroundStyle(Theme.textPrimary)
            }
        }
        .frame(width: diameter, height: diameter)
    }
}
