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
    // 오늘 요약 (medium 위젯)
    let feedCount: Int
    let totalFeedMl: Int
    let diaperCount: Int
    let sleepCount: Int
    let totalSleepMinutes: Int
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> FeedEntry {
        FeedEntry(date: Date(), babyName: "아기", lastFedAt: Date(), nextFeedAt: Date(),
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
        switch family {
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
            .systemSmall, .systemMedium,
            .accessoryRectangular, .accessoryCircular, .accessoryInline,
        ])
    }
}
