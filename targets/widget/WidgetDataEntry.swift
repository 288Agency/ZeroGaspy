import WidgetKit
import Foundation

// MARK: - Data Models

struct ExpiringFoodEntry: Codable {
    let name: String
    let daysLeft: Int
    let listName: String
}

struct WidgetPayload: Codable {
    let expiringFoods: [ExpiringFoodEntry]
    let monthlySavings: Double
    let lastUpdated: String
}

// MARK: - Timeline Entry

struct ZeroGaspyEntry: TimelineEntry {
    let date: Date
    let expiringFoods: [ExpiringFoodEntry]
    let monthlySavings: Double
}

// MARK: - Data Loading

func loadWidgetPayload() -> WidgetPayload? {
    guard let defaults = UserDefaults(suiteName: "group.com.zerogaspy.app.widget"),
          let jsonString = defaults.string(forKey: "widgetData"),
          let jsonData = jsonString.data(using: .utf8) else {
        return nil
    }
    return try? JSONDecoder().decode(WidgetPayload.self, from: jsonData)
}

// MARK: - Timeline Provider

struct ZeroGaspyProvider: TimelineProvider {

    func placeholder(in context: Context) -> ZeroGaspyEntry {
        ZeroGaspyEntry(
            date: Date(),
            expiringFoods: [
                ExpiringFoodEntry(name: "Poulet", daysLeft: 0, listName: "Frigo"),
                ExpiringFoodEntry(name: "Yaourt", daysLeft: 1, listName: "Frigo"),
            ],
            monthlySavings: 34
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (ZeroGaspyEntry) -> Void) {
        let payload = loadWidgetPayload()
        let entry = ZeroGaspyEntry(
            date: Date(),
            expiringFoods: payload?.expiringFoods ?? [],
            monthlySavings: payload?.monthlySavings ?? 0
        )
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ZeroGaspyEntry>) -> Void) {
        let payload = loadWidgetPayload()
        let entry = ZeroGaspyEntry(
            date: Date(),
            expiringFoods: payload?.expiringFoods ?? [],
            monthlySavings: payload?.monthlySavings ?? 0
        )
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}
