import WidgetKit
import SwiftUI

// MARK: - Colors

private let colorGreen = Color(red: 60/255, green: 110/255, blue: 71/255)
private let colorCream = Color(red: 247/255, green: 245/255, blue: 230/255)
private let colorRed = Color(red: 239/255, green: 68/255, blue: 68/255)
private let colorOrange = Color(red: 249/255, green: 115/255, blue: 22/255)
private let colorYellow = Color(red: 234/255, green: 179/255, blue: 8/255)

// MARK: - Helpers

private func expirationColor(daysLeft: Int) -> Color {
    if daysLeft < 0 { return colorRed }
    if daysLeft == 0 { return colorOrange }
    if daysLeft <= 2 { return colorYellow }
    return colorGreen
}

private func expirationLabel(daysLeft: Int) -> String {
    if daysLeft < 0 { return "Expiré" }
    if daysLeft == 0 { return "Auj." }
    if daysLeft == 1 { return "Demain" }
    return "\(daysLeft)j"
}

// MARK: - Small Widget (2×2)

struct SmallWidgetView: View {
    let entry: ZeroGaspyEntry

    var urgentCount: Int {
        entry.expiringFoods.filter { $0.daysLeft <= 1 }.count
    }

    var body: some View {
        ZStack {
            colorCream
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("🥗")
                        .font(.system(size: 20))
                    Spacer()
                    if urgentCount > 0 {
                        Text("\(urgentCount)")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.white)
                            .frame(width: 22, height: 22)
                            .background(colorRed)
                            .clipShape(Circle())
                    }
                }
                Text("ZeroGaspy")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(colorGreen)
                Spacer()
                if entry.monthlySavings > 0 {
                    Text("~\(Int(entry.monthlySavings)) € économisés")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(colorGreen)
                }
                Text(entry.expiringFoods.isEmpty
                     ? "Tout va bien ✨"
                     : "\(entry.expiringFoods.count) à surveiller")
                    .font(.system(size: 10))
                    .foregroundColor(.secondary)
            }
            .padding(12)
        }
    }
}

// MARK: - Medium Widget (4×2)

struct MediumWidgetView: View {
    let entry: ZeroGaspyEntry

    var body: some View {
        ZStack {
            colorCream
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("🥗 ZeroGaspy")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(colorGreen)
                    Spacer()
                    if entry.monthlySavings > 0 {
                        Text("~\(Int(entry.monthlySavings)) €")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(colorGreen)
                    }
                }

                Divider()

                if entry.expiringFoods.isEmpty {
                    Spacer()
                    HStack {
                        Spacer()
                        VStack(spacing: 4) {
                            Text("✨")
                                .font(.system(size: 24))
                            Text("Aucun aliment n'expire bientôt")
                                .font(.system(size: 11))
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        Spacer()
                    }
                    Spacer()
                } else {
                    ForEach(Array(entry.expiringFoods.prefix(3).enumerated()), id: \.offset) { _, food in
                        FoodRowView(food: food)
                    }
                    if entry.expiringFoods.count > 3 {
                        Text("+ \(entry.expiringFoods.count - 3) autre\(entry.expiringFoods.count - 3 > 1 ? "s" : "")")
                            .font(.system(size: 10))
                            .foregroundColor(.secondary)
                            .italic()
                    }
                }
                Spacer(minLength: 0)
            }
            .padding(12)
        }
    }
}

struct FoodRowView: View {
    let food: ExpiringFoodEntry

    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(expirationColor(daysLeft: food.daysLeft))
                .frame(width: 8, height: 8)
            Text(food.name)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(colorGreen)
                .lineLimit(1)
            Spacer()
            Text(expirationLabel(daysLeft: food.daysLeft))
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(expirationColor(daysLeft: food.daysLeft))
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(expirationColor(daysLeft: food.daysLeft).opacity(0.15))
                .clipShape(Capsule())
        }
    }
}

// MARK: - Widget Definition

struct ZeroGaspyWidget: Widget {
    let kind: String = "ZeroGaspyWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ZeroGaspyProvider()) { entry in
            ZeroGaspyWidgetEntryView(entry: entry)
                .widgetURL(URL(string: "zerogaspy://expiring-soon"))
        }
        .configurationDisplayName("ZeroGaspy")
        .description("Voir les aliments qui expirent bientôt.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct ZeroGaspyWidgetEntryView: View {
    var entry: ZeroGaspyEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        default:
            SmallWidgetView(entry: entry)
        }
    }
}
