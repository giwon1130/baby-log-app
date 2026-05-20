import WidgetKit
import SwiftUI

// 앱(ExtensionStorage)이 epoch milliseconds 로 써둔 값을 읽는다.
private let appGroup = "group.com.giwon.babylog"
private let brandPink = Color(red: 1.0, green: 0.42, blue: 0.62) // #FF6B9D

struct FeedEntry: TimelineEntry {
    let date: Date
    let babyName: String
    let lastFedAt: Date?
    let nextFeedAt: Date?
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> FeedEntry {
        FeedEntry(date: Date(), babyName: "아기", lastFedAt: Date(), nextFeedAt: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (FeedEntry) -> Void) {
        completion(readEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<FeedEntry>) -> Void) {
        // 상대 시간 표시가 흐르도록 15분마다 타임라인 갱신.
        let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
        completion(Timeline(entries: [readEntry()], policy: .after(next)))
    }

    private func readEntry() -> FeedEntry {
        let defaults = UserDefaults(suiteName: appGroup)
        let name = defaults?.string(forKey: "babyName") ?? "아기"
        return FeedEntry(
            date: Date(),
            babyName: name,
            lastFedAt: dateFromMillis(defaults?.object(forKey: "lastFedAt")),
            nextFeedAt: dateFromMillis(defaults?.object(forKey: "nextFeedAt"))
        )
    }

    private func dateFromMillis(_ raw: Any?) -> Date? {
        guard let ms = (raw as? NSNumber)?.doubleValue, ms > 0 else { return nil }
        return Date(timeIntervalSince1970: ms / 1000.0)
    }
}

struct WidgetEntryView: View {
    var entry: FeedEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 4) {
                Text("🍼").font(.caption)
                Text(entry.babyName)
                    .font(.caption).bold()
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }

            Spacer(minLength: 2)

            Text("마지막 수유")
                .font(.system(size: 10))
                .foregroundColor(.secondary)
            if let last = entry.lastFedAt {
                Text(last, style: .relative)
                    .font(.system(size: 15, weight: .bold))
            } else {
                Text("기록 없음")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.secondary)
            }

            Spacer(minLength: 2)

            if let next = entry.nextFeedAt {
                Text("다음 수유")
                    .font(.system(size: 10))
                    .foregroundColor(.secondary)
                Text(next, style: .time)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(brandPink)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
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
        .description("마지막·다음 수유 시간을 한눈에")
        .supportedFamilies([.systemSmall])
    }
}
