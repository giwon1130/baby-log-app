import WidgetKit
import SwiftUI

// 앱(ExtensionStorage)이 App Group 에 써둔 값을 읽는다.
private let appGroup = "group.com.giwon.babylog"
private let brandPink = Color(red: 1.0, green: 0.42, blue: 0.62)  // #FF6B9D

struct FeedEntry: TimelineEntry {
    let date: Date
    let babyName: String
    let lastFedAt: Date?
    let nextFeedAt: Date?
    // 마지막 활동 (large 위젯)
    let lastDiaperAt: Date?
    let lastSleepEndAt: Date?
    // 오늘 요약 (medium·large 위젯)
    let feedCount: Int
    let totalFeedMl: Int
    let diaperCount: Int
    let sleepCount: Int
    let totalSleepMinutes: Int
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> FeedEntry {
        FeedEntry(date: Date(), babyName: "아기", lastFedAt: Date(), nextFeedAt: Date(),
                  lastDiaperAt: Date(), lastSleepEndAt: Date(),
                  feedCount: 6, totalFeedMl: 540, diaperCount: 5, sleepCount: 3, totalSleepMinutes: 540)
    }

    func getSnapshot(in context: Context, completion: @escaping (FeedEntry) -> Void) {
        completion(readEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<FeedEntry>) -> Void) {
        let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
        completion(Timeline(entries: [readEntry()], policy: .after(next)))
    }

    private func readEntry() -> FeedEntry {
        let d = UserDefaults(suiteName: appGroup)
        return FeedEntry(
            date: Date(),
            babyName: d?.string(forKey: "babyName") ?? "아기",
            lastFedAt: dateFromMillis(d?.object(forKey: "lastFedAt")),
            nextFeedAt: dateFromMillis(d?.object(forKey: "nextFeedAt")),
            lastDiaperAt: dateFromMillis(d?.object(forKey: "lastDiaperAt")),
            lastSleepEndAt: dateFromMillis(d?.object(forKey: "lastSleepEndAt")),
            feedCount: d?.integer(forKey: "feedCount") ?? 0,
            totalFeedMl: d?.integer(forKey: "totalFeedMl") ?? 0,
            diaperCount: d?.integer(forKey: "diaperCount") ?? 0,
            sleepCount: d?.integer(forKey: "sleepCount") ?? 0,
            totalSleepMinutes: d?.integer(forKey: "totalSleepMinutes") ?? 0
        )
    }

    private func dateFromMillis(_ raw: Any?) -> Date? {
        guard let ms = (raw as? NSNumber)?.doubleValue, ms > 0 else { return nil }
        return Date(timeIntervalSince1970: ms / 1000.0)
    }
}

// ── 공통 조각 ────────────────────────────────────────────────────────────

private func sleepText(_ minutes: Int) -> String {
    let h = minutes / 60
    let m = minutes % 60
    return h > 0 ? "\(h)시간 \(m)분" : "\(m)분"
}

private struct FeedTimes: View {
    let entry: FeedEntry
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("마지막 수유")
                .font(.system(size: 10)).foregroundColor(.secondary)
            if let last = entry.lastFedAt {
                Text(last, style: .relative).font(.system(size: 15, weight: .bold))
            } else {
                Text("기록 없음").font(.system(size: 15, weight: .bold)).foregroundColor(.secondary)
            }
            if let next = entry.nextFeedAt {
                Text("다음 수유")
                    .font(.system(size: 10)).foregroundColor(.secondary)
                    .padding(.top, 2)
                Text(next, style: .time)
                    .font(.system(size: 14, weight: .bold)).foregroundColor(brandPink)
            }
        }
    }
}

private struct SummaryRow: View {
    let icon: String
    let label: String
    let value: String
    var body: some View {
        HStack(spacing: 4) {
            Text(icon).font(.system(size: 11))
            Text(label).font(.system(size: 11)).foregroundColor(.secondary)
            Spacer(minLength: 2)
            Text(value).font(.system(size: 12, weight: .bold))
        }
    }
}

// ── Small ────────────────────────────────────────────────────────────────

struct SmallWidgetView: View {
    let entry: FeedEntry
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 4) {
                Text("🍼").font(.caption)
                Text(entry.babyName)
                    .font(.caption).bold().foregroundColor(.secondary).lineLimit(1)
            }
            Spacer(minLength: 2)
            FeedTimes(entry: entry)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

// ── Medium ───────────────────────────────────────────────────────────────

struct MediumWidgetView: View {
    let entry: FeedEntry
    var body: some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 4) {
                    Text("🍼").font(.caption)
                    Text(entry.babyName)
                        .font(.caption).bold().foregroundColor(.secondary).lineLimit(1)
                }
                Spacer(minLength: 2)
                FeedTimes(entry: entry)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Divider()

            VStack(alignment: .leading, spacing: 7) {
                Text("오늘")
                    .font(.system(size: 10, weight: .bold)).foregroundColor(.secondary)
                SummaryRow(icon: "🍼", label: "수유", value: "\(entry.feedCount)회 · \(entry.totalFeedMl)ml")
                SummaryRow(icon: "🧷", label: "기저귀", value: "\(entry.diaperCount)회")
                SummaryRow(icon: "😴", label: "수면", value: sleepText(entry.totalSleepMinutes))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

// ── Large ────────────────────────────────────────────────────────────────

/** 마지막 활동 한 줄 — 아이콘·라벨·상대시각. 탭 영역(Link)으로 감싸 사용. */
private struct ActivityRow: View {
    let icon: String
    let label: String
    let date: Date?
    let accent: Color
    var body: some View {
        HStack(spacing: 8) {
            Text(icon).font(.system(size: 14))
            Text(label).font(.system(size: 13)).foregroundColor(.secondary)
            Spacer(minLength: 4)
            if let date = date {
                Text(date, style: .relative).font(.system(size: 14, weight: .bold)).foregroundColor(accent)
            } else {
                Text("기록 없음").font(.system(size: 13, weight: .semibold)).foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 5)
        .contentShape(Rectangle())
    }
}

private struct SummaryStat: View {
    let icon: String
    let value: String
    let sub: String
    var body: some View {
        VStack(spacing: 1) {
            Text(icon).font(.system(size: 13))
            Text(value).font(.system(size: 13, weight: .bold))
            Text(sub).font(.system(size: 10)).foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct LargeWidgetView: View {
    let entry: FeedEntry
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Text("🍼").font(.title3)
                Text(entry.babyName).font(.headline).bold().lineLimit(1)
                Spacer()
                if let next = entry.nextFeedAt {
                    Text("다음 수유 ").font(.system(size: 11)).foregroundColor(.secondary)
                    + Text(next, style: .time).font(.system(size: 12, weight: .bold)).foregroundColor(brandPink)
                }
            }

            Divider()

            // 마지막 활동 — 각 행 탭 시 앱의 해당 기록 화면으로 (widgetURL 딥링크)
            Link(destination: URL(string: "babylog://log/feed")!) {
                ActivityRow(icon: "🍼", label: "마지막 수유", date: entry.lastFedAt, accent: brandPink)
            }
            Link(destination: URL(string: "babylog://log/diaper")!) {
                ActivityRow(icon: "🧷", label: "마지막 기저귀", date: entry.lastDiaperAt, accent: .primary)
            }
            Link(destination: URL(string: "babylog://log/sleep")!) {
                ActivityRow(icon: "😴", label: "마지막 수면", date: entry.lastSleepEndAt, accent: .primary)
            }

            Divider()

            HStack(alignment: .top, spacing: 4) {
                SummaryStat(icon: "🍼", value: "\(entry.feedCount)회", sub: "\(entry.totalFeedMl)ml")
                SummaryStat(icon: "🧷", value: "\(entry.diaperCount)회", sub: "기저귀")
                SummaryStat(icon: "😴", value: "\(entry.sleepCount)회", sub: sleepText(entry.totalSleepMinutes))
            }
            .padding(.top, 2)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

// ── Lock Screen (accessory, iOS 16+) ─────────────────────────────────────

struct AccessoryRectangularView: View {
    let entry: FeedEntry
    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            HStack(spacing: 3) {
                Image(systemName: "drop.fill").font(.system(size: 11))
                Text(entry.babyName).font(.caption2).bold().lineLimit(1)
            }
            if let last = entry.lastFedAt {
                Text("마지막 \(last, style: .relative)").font(.caption2)
            }
            if let next = entry.nextFeedAt {
                Text("다음 \(next, style: .time)").font(.caption2).bold()
            }
        }
    }
}

struct AccessoryCircularView: View {
    let entry: FeedEntry
    var body: some View {
        VStack(spacing: 1) {
            Image(systemName: "drop.fill").font(.system(size: 11))
            if let next = entry.nextFeedAt {
                Text(next, style: .time).font(.system(size: 11, weight: .bold))
            } else {
                Text("—").font(.system(size: 11, weight: .bold))
            }
        }
    }
}

struct AccessoryInlineView: View {
    let entry: FeedEntry
    var body: some View {
        if let next = entry.nextFeedAt {
            Text("🍼 다음 수유 \(next, style: .time)")
        } else if let last = entry.lastFedAt {
            Text("🍼 마지막 \(last, style: .relative)")
        } else {
            Text("🍼 수유 기록 없음")
        }
    }
}

// ── Entry dispatch ───────────────────────────────────────────────────────

struct WidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: FeedEntry

    var body: some View {
        content.widgetURL(URL(string: "babylog://home"))
    }

    @ViewBuilder
    private var content: some View {
        switch family {
        case .systemLarge:
            LargeWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        case .accessoryRectangular:
            AccessoryRectangularView(entry: entry)
        case .accessoryCircular:
            AccessoryCircularView(entry: entry)
        case .accessoryInline:
            AccessoryInlineView(entry: entry)
        default:
            SmallWidgetView(entry: entry)
        }
    }
}

@main
struct BabyLogWidget: Widget {
    let kind = "BabyLogWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            if #available(iOS 17.0, *) {
                WidgetEntryView(entry: entry)
                    .containerBackground(.fill.tertiary, for: .widget)
            } else {
                WidgetEntryView(entry: entry)
                    .padding()
            }
        }
        .configurationDisplayName("수유 현황")
        .description("마지막·다음 수유와 오늘 요약을 한눈에")
        .supportedFamilies([
            .systemSmall, .systemMedium, .systemLarge,
            .accessoryRectangular, .accessoryCircular, .accessoryInline,
        ])
    }
}
