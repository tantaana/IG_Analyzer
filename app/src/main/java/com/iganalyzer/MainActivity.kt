package com.iganalyzer

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.os.Build
import android.os.Bundle
import android.view.KeyEvent
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.webkit.*
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // ── Full-screen / immersive mode ──────────────────────────────────────
        supportActionBar?.hide()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.apply {
                hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                systemBarsBehavior =
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN
            )
        }

        setContentView(R.layout.activity_main)
        webView = findViewById(R.id.webView)

        configureWebView()
        webView.loadUrl("https://www.instagram.com/")
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {

        // ── Settings ──────────────────────────────────────────────────────────
        webView.settings.apply {
            javaScriptEnabled    = true   // Required for the analyzer script
            domStorageEnabled    = true   // Required for localStorage
            databaseEnabled      = true
            useWideViewPort      = true   // Use Instagram's viewport meta
            loadWithOverviewMode = true
            setSupportZoom(true)
            builtInZoomControls  = true
            displayZoomControls  = false  // Hide +/- zoom buttons; pinch is enough

            // Desktop Chrome UA → loads the full web version of Instagram
            // that the analyzer script was written for (not the mobile redirect).
            userAgentString =
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
                "AppleWebKit/537.36 (KHTML, like Gecko) " +
                "Chrome/122.0.0.0 Safari/537.36"
        }

        // ── Cookies ───────────────────────────────────────────────────────────
        // The script uses credentials:"include" on every fetch. Cookies must
        // be enabled so Instagram keeps the user logged in between sessions.
        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, true)
        }

        // ── WebViewClient ─────────────────────────────────────────────────────
        webView.webViewClient = object : WebViewClient() {

            /**
             * Block intent:// deep-links so Instagram can't redirect
             * the user to the native Instagram app.
             */
            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                val scheme = request.url.scheme ?: ""
                // Only allow http and https; block intent://, market://, etc.
                return scheme != "https" && scheme != "http"
            }

            /**
             * Re-inject the analyzer script after every instagram.com page load.
             * This covers:
             *   - Initial app open (home page)
             *   - After the user triggers a redirect to a profile URL
             *   - Any hard navigation within Instagram
             */
            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                if (url.contains("instagram.com")) {
                    injectScript(view)
                }
            }
        }

        // ── WebChromeClient ───────────────────────────────────────────────────
        webView.webChromeClient = object : WebChromeClient() {
            /** Show JS alert() calls as native Android dialogs. */
            override fun onJsAlert(
                view: WebView,
                url: String,
                message: String,
                result: JsResult
            ): Boolean {
                AlertDialog.Builder(this@MainActivity)
                    .setMessage(message)
                    .setPositiveButton("OK") { _, _ -> result.confirm() }
                    .setCancelable(false)
                    .show()
                return true
            }
        }
    }

    /**
     * Read igscript.js from assets and evaluate it in the WebView's page context.
     * evaluateJavascript() bypasses CSP (it runs at the native layer, not as an
     * inline script), so Instagram's Content-Security-Policy does not block it.
     */
    private fun injectScript(view: WebView) {
        try {
            val js = assets.open("igscript.js").bufferedReader().use { it.readText() }
            view.evaluateJavascript(js, null)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /** Hardware back button navigates WebView history before closing the app. */
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }
}
