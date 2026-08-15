/**
 * T051, T053: Android Home Screen Widget (RemoteViews via react-native-android-widget)
 *
 * This is a render-only Android widget that reads WidgetPayload from SharedPreferences
 * and displays one of six states using platform-native RemoteViews.
 *
 * RemoteViews are immutable snapshots (no interactivity beyond tap). The widget framework
 * provides the view hierarchy and layout; we populate it with data and semantic tokens.
 *
 * **Principle I**: Tapping opens Google Maps (listingUrl or fallbackUrl), never the app.
 * **Principle VI**: Only semantic tokens (generated colors from design-tokens).
 * **FR-005**: Refresh button advances cursor via WorkManager + App Intent broadcast.
 * **FR-040**: Snapshots only; no animated states.
 *
 * Generated colors live in `res/values/colors.xml` and `res/values-night/colors.xml`
 * (created by design-tokens generator). Referenced as `@color/text_primary`, etc.
 */

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.widget.RemoteViews
import com.google.gson.Gson
import java.net.URLEncoder

/**
 * T051: Widget provider (entry point for Android widget framework).
 */
class GoEatWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray
  ) {
    for (appWidgetId in appWidgetIds) {
      val payload = readPayload(context)
      val views = when {
        payload != null -> renderWidget(context, payload)
        else -> renderLoadingWidget(context)
      }
      appWidgetManager.updateAppWidget(appWidgetId, views)
    }
  }

  /**
   * Read WidgetPayload from SharedPreferences.
   */
  private fun readPayload(context: Context): WidgetPayload? {
    return try {
      val prefs = context.getSharedPreferences("goeat_widget", Context.MODE_PRIVATE)
      val json = prefs.getString("widget_payload", null) ?: return null
      Gson().fromJson(json, WidgetPayload::class.java)
    } catch (e: Exception) {
      null
    }
  }

  /**
   * Route to the appropriate state renderer.
   */
  private fun renderWidget(context: Context, payload: WidgetPayload): RemoteViews {
    return when (payload.state) {
      "suggestion" -> renderSuggestionState(context, payload)
      "permission_required" -> renderPermissionRequiredState(context)
      "no_results" -> renderNoResultsState(context)
      "all_filtered" -> renderAllFilteredState(context)
      "stale" -> renderStaleState(context, payload)
      "loading" -> renderLoadingState(context)
      else -> renderLoadingState(context)
    }
  }

  /**
   * T051: Render suggestion state.
   */
  private fun renderSuggestionState(context: Context, payload: WidgetPayload): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.widget_suggestion)

    payload.item?.let { item ->
      views.setTextViewText(R.id.restaurant_name, item.name)
      views.setTextViewText(
        R.id.restaurant_info,
        buildInfoText(item.cuisineLabel, item.rating, item.distance)
      )

      // Tap to open Maps
      val intent = Intent(Intent.ACTION_VIEW).apply {
        data = Uri.parse(item.listingUrl ?: item.fallbackUrl)
      }
      val pendingIntent =
        PendingIntent.getActivity(
          context,
          0,
          intent,
          PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
      views.setOnClickPendingIntent(R.id.tap_button, pendingIntent)
    }

    return views
  }

  /**
   * T051: Render permission required state.
   */
  private fun renderPermissionRequiredState(context: Context): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.widget_permission)

    val intent = Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
      data = Uri.parse("package:${context.packageName}")
    }
    val pendingIntent =
      PendingIntent.getActivity(
        context,
        0,
        intent,
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
      )
    views.setOnClickPendingIntent(R.id.settings_button, pendingIntent)

    return views
  }

  /**
   * T051: Render no results state.
   */
  private fun renderNoResultsState(context: Context): RemoteViews {
    return RemoteViews(context.packageName, R.layout.widget_no_results)
  }

  /**
   * T051: Render all filtered state.
   */
  private fun renderAllFilteredState(context: Context): RemoteViews {
    return RemoteViews(context.packageName, R.layout.widget_all_filtered)
  }

  /**
   * T051: Render stale state.
   */
  private fun renderStaleState(context: Context, payload: WidgetPayload): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.widget_stale)

    payload.item?.let { item ->
      views.setTextViewText(R.id.restaurant_name, item.name)
      views.setTextViewText(
        R.id.restaurant_info,
        buildInfoText(item.cuisineLabel, item.rating, item.distance)
      )

      val intent = Intent(Intent.ACTION_VIEW).apply {
        data = Uri.parse(item.listingUrl ?: item.fallbackUrl)
      }
      val pendingIntent =
        PendingIntent.getActivity(
          context,
          0,
          intent,
          PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
      views.setOnClickPendingIntent(R.id.tap_button, pendingIntent)
    }

    return views
  }

  /**
   * T051: Render loading state.
   */
  private fun renderLoadingState(context: Context): RemoteViews {
    return RemoteViews(context.packageName, R.layout.widget_loading)
  }

  private fun buildInfoText(cuisine: String?, rating: Double?, distance: String?): String {
    val parts = listOf(
      cuisine ?: "Restaurant",
      rating?.let { String.format("%.1f ⭐", it) },
      distance
    ).filterNotNull()

    return parts.joinToString(" · ")
  }
}

/**
 * T051: Data classes (mirror of contract-types).
 */
data class WidgetPayload(
  val state: String,
  val item: SuggestionItem?,
  val items: List<SuggestionItem>,
  val cycleId: String,
  val seed: String,
  val issuedAt: String,
  val updatedAt: String,
  val cursor: Int,
  val refreshEnabled: Boolean,
  val batchSize: Int,
  val isStale: Boolean
)

data class SuggestionItem(
  val placeId: String,
  val name: String,
  val cuisineLabel: String,
  val rating: Double,
  val reviewCount: String,
  val distance: String,
  val listingUrl: String?,
  val fallbackUrl: String?
)
