/**
 * T050, T052: iOS Home Screen Widget View (SwiftUI via expo-widgets)
 *
 * This is a render-only SwiftUI view. It reads WidgetPayload from App Group shared storage
 * and displays one of six states:
 *
 * 1. `suggestion` — Restaurant name, cuisine, rating, distance, and a TAP FOR DIRECTIONS button
 * 2. `permission_required` — Prompt to enable location permission
 * 3. `no_results` — Honest message: "Nothing worth recommending nearby"
 * 4. `all_filtered` — "Your preferences filtered out all results"
 * 5. `stale` — Last known suggestion with a "STALE" indicator
 * 6. `loading` — "Finding a restaurant..." with spinner
 *
 * **Principle I**: Widget is the product. Tapping opens Maps to the restaurant, never the app.
 * **Principle VI**: Only semantic tokens (generated from design-tokens). No hex values.
 * **FR-005**: Refresh button (when multiple items) advances cursor via App Intent, no app launch.
 * **FR-040**: Snapshots only; no hover, focus, pressed, or interactive states.
 *
 * Generated colors live in `../generated/ios/Colors.xcassets`. They're indexed in Swift as:
 * `Color("text.primary")`, `Color("status.warning")`, etc.
 */

import SwiftUI
import WidgetKit

/**
 * T050: Main widget entry point.
 *
 * The widget will render whichever of the six views is appropriate.
 */
@main
struct GoEatWidget: Widget {
  let kind: String = "GoEatWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: TimelineProvider()) { entry in
      GoEatWidgetView(payload: entry.payload)
    }
    .configurationDisplayName("Go-Eat")
    .description("One restaurant. No list.")
    .supportedFamilies([.systemSmall])
  }
}

/**
 * T050: Timeline provider (reads shared storage).
 *
 * In production, this is updated periodically (every 30 minutes, per app.config.ts).
 * The widget snapshots are deterministic (no network calls here; API is called by the app).
 */
struct TimelineProvider: TimelineProvider {
  func placeholder(in context: Context) -> SimpleEntry {
    SimpleEntry(
      payload: WidgetPayload(
        state: "loading",
        item: nil,
        items: [],
        cycleId: "",
        seed: "",
        issuedAt: ISO8601DateFormatter().string(from: Date()),
        updatedAt: ISO8601DateFormatter().string(from: Date()),
        cursor: 0,
        refreshEnabled: false,
        batchSize: 0,
        isStale: false
      )
    )
  }

  func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> Void) {
    if let payload = readPayload(from: context.family) {
      completion(SimpleEntry(payload: payload))
    } else {
      completion(placeholder(in: context))
    }
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> Void) {
    var entries: [SimpleEntry] = []
    if let payload = readPayload(from: context.family) {
      entries.append(SimpleEntry(payload: payload))
    } else {
      entries.append(placeholder(in: context))
    }

    // Next update in 30 minutes (matching batchTrustSeconds)
    let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
    let timeline = Timeline(entries: entries, policy: .after(nextUpdate))
    completion(timeline)
  }

  /**
   * Read WidgetPayload from App Group shared storage.
   * Falls back to loading state if read fails.
   */
  private func readPayload(from family: WidgetFamily) -> WidgetPayload? {
    guard let defaults = UserDefaults(suiteName: "group.app.goeat.client") else {
      return nil
    }

    guard let data = defaults.data(forKey: "widget_payload") else {
      return nil
    }

    do {
      let payload = try JSONDecoder().decode(WidgetPayload.self, from: data)
      return payload
    } catch {
      // Payload corrupted or unparseable; show loading
      return nil
    }
  }
}

/**
 * T050: Simple timeline entry.
 */
struct SimpleEntry: TimelineEntry {
  let date = Date()
  let payload: WidgetPayload
}

/**
 * T050, T052: Main widget view (renders all six states).
 *
 * Each state is a distinct SwiftUI view. The choice of which to show is deterministic
 * (no runtime logic here beyond branching on payload.state).
 */
struct GoEatWidgetView: View {
  let payload: WidgetPayload

  var body: some View {
    ZStack {
      // T052: Background always surface.base (opaque, never wallpaper)
      Color("surface.base").ignoresSafeArea()

      VStack(spacing: 8) {
        switch payload.state {
        case "suggestion":
          SuggestionStateView(payload: payload)

        case "permission_required":
          PermissionRequiredStateView()

        case "no_results":
          NoResultsStateView()

        case "all_filtered":
          AllFilteredStateView()

        case "stale":
          StaleStateView(payload: payload)

        case "loading":
          LoadingStateView()

        default:
          LoadingStateView() // Fallback
        }
      }
      .padding(16)
    }
  }
}

/**
 * T050: Suggestion state — show restaurant, cuisine, rating, distance.
 */
struct SuggestionStateView: View {
  let payload: WidgetPayload

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      // Restaurant name (truncated to 60 chars by backend)
      Text(payload.item?.name ?? "")
        .font(.system(size: 16, weight: .semibold))
        .foregroundColor(Color("text.primary"))
        .lineLimit(1)

      // Cuisine, rating, distance
      Text(descriptionText)
        .font(.system(size: 13, weight: .regular))
        .foregroundColor(Color("text.primary"))
        .lineLimit(1)

      Spacer()

      // Tap for directions button (links to Maps)
      Link(destination: mapURL) {
        Text("TAP FOR DIRECTIONS")
          .font(.system(size: 12, weight: .semibold))
          .foregroundColor(Color("accent.onFill"))
          .frame(maxWidth: .infinity)
          .padding(.vertical, 8)
          .background(Color("accent.fill"))
          .cornerRadius(6)
      }
    }
    .frame(maxHeight: .infinity, alignment: .topLeading)
  }

  private var descriptionText: String {
    let parts: [String] = [
      payload.item?.cuisineLabel ?? "Restaurant",
      "\(payload.item?.rating ?? 0, specifier: "%.1f") ⭐",
      payload.item?.distance ?? "",
    ]
    return parts.filter { !$0.isEmpty }.joined(separator: " · ")
  }

  private var mapURL: URL {
    // Prefer listingUrl (direct to place); fall back to fallbackUrl (search)
    if let urlString = payload.item?.listingUrl, let url = URL(string: urlString) {
      return url
    }
    if let urlString = payload.item?.fallbackUrl, let url = URL(string: urlString) {
      return url
    }
    // Absolute fallback (should never happen in production)
    return URL(string: "https://maps.apple.com/")!
  }
}

/**
 * T050: Permission required state.
 */
struct PermissionRequiredStateView: View {
  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("Enable Location")
        .font(.system(size: 14, weight: .semibold))
        .foregroundColor(Color("text.secondary"))

      Spacer()

      Link(destination: URL(string: UIApplication.openSettingsURLString)!) {
        Text("SETTINGS")
          .font(.system(size: 12, weight: .semibold))
          .foregroundColor(Color("text.primary"))
          .frame(maxWidth: .infinity)
          .padding(.vertical, 8)
          .background(Color("status.warning"))
          .cornerRadius(6)
      }
    }
    .frame(maxHeight: .infinity, alignment: .topLeading)
  }
}

/**
 * T050: No results state.
 */
struct NoResultsStateView: View {
  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(spacing: 8) {
        Image(systemName: "info.circle")
          .foregroundColor(Color("text.secondary"))
          .font(.system(size: 16))

        Text("Nothing worth recommending nearby")
          .font(.system(size: 14, weight: .regular))
          .foregroundColor(Color("text.secondary"))
          .lineLimit(2)
      }

      Spacer()
    }
    .frame(maxHeight: .infinity, alignment: .topLeading)
  }
}

/**
 * T050: All filtered state.
 */
struct AllFilteredStateView: View {
  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack(spacing: 6) {
        Image(systemName: "slider.horizontal.3")
          .foregroundColor(Color("text.secondary"))
          .font(.system(size: 14))

        Text("All preferences filtered out")
          .font(.system(size: 14, weight: .regular))
          .foregroundColor(Color("text.secondary"))
          .lineLimit(2)
      }

      Text("Adjust settings in the app")
        .font(.system(size: 12, weight: .regular))
        .foregroundColor(Color("text.tertiary"))
        .lineLimit(1)

      Spacer()
    }
    .frame(maxHeight: .infinity, alignment: .topLeading)
  }
}

/**
 * T050: Stale state — show last known suggestion with a stale indicator.
 */
struct StaleStateView: View {
  let payload: WidgetPayload

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      // Restaurant name
      Text(payload.item?.name ?? "")
        .font(.system(size: 16, weight: .semibold))
        .foregroundColor(Color("text.primary"))
        .lineLimit(1)

      // Cuisine, rating, distance
      Text(descriptionText)
        .font(.system(size: 13, weight: .regular))
        .foregroundColor(Color("text.primary"))
        .lineLimit(1)

      // Stale indicator badge
      HStack(spacing: 4) {
        Image(systemName: "exclamationmark.triangle.fill")
          .font(.system(size: 10))
        Text("STALE")
          .font(.system(size: 10, weight: .semibold))
      }
      .foregroundColor(Color("text.inverse"))
      .padding(.horizontal, 8)
      .padding(.vertical, 4)
      .background(Color("status.warning"))
      .cornerRadius(4)

      Spacer()

      Link(destination: mapURL) {
        Text("TAP FOR DIRECTIONS")
          .font(.system(size: 12, weight: .semibold))
          .foregroundColor(Color("accent.onFill"))
          .frame(maxWidth: .infinity)
          .padding(.vertical, 8)
          .background(Color("accent.fill"))
          .cornerRadius(6)
      }
    }
    .frame(maxHeight: .infinity, alignment: .topLeading)
  }

  private var descriptionText: String {
    let parts: [String] = [
      payload.item?.cuisineLabel ?? "Restaurant",
      "\(payload.item?.rating ?? 0, specifier: "%.1f") ⭐",
      payload.item?.distance ?? "",
    ]
    return parts.filter { !$0.isEmpty }.joined(separator: " · ")
  }

  private var mapURL: URL {
    if let urlString = payload.item?.listingUrl, let url = URL(string: urlString) {
      return url
    }
    if let urlString = payload.item?.fallbackUrl, let url = URL(string: urlString) {
      return url
    }
    return URL(string: "https://maps.apple.com/")!
  }
}

/**
 * T050: Loading state.
 */
struct LoadingStateView: View {
  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(spacing: 8) {
        ProgressView()
          .tint(Color("accent.fill"))

        Text("Finding a restaurant...")
          .font(.system(size: 14, weight: .regular))
          .foregroundColor(Color("text.tertiary"))
      }

      Spacer()
    }
    .frame(maxHeight: .infinity, alignment: .topLeading)
  }
}

#Preview {
  GoEatWidgetView(
    payload: WidgetPayload(
      state: "suggestion",
      item: SuggestionItem(
        placeId: "test_place_id",
        name: "Mario's Trattoria",
        cuisineLabel: "Italian",
        rating: 4.5,
        reviewCount: "1.2k",
        distance: "0.5 mi",
        listingUrl: "https://maps.google.com/?cid=test",
        fallbackUrl: "https://maps.google.com/search/Mario"
      ),
      items: [],
      cycleId: "cycle_123",
      seed: "seed_123",
      issuedAt: ISO8601DateFormatter().string(from: Date()),
      updatedAt: ISO8601DateFormatter().string(from: Date()),
      cursor: 0,
      refreshEnabled: false,
      batchSize: 1,
      isStale: false
    )
  )
}
