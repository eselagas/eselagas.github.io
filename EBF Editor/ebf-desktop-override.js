	/* Script for Desktop functionality replacement */

	function setTitle(title) {
		document.title = title;
		app_run("title", title);
	}

	function app_run(f, v) {
		log("Running App Action");
		if (html) {
			log("Rejecting - standalone mode")
		} else {
	        if (f) {
	            const payload = { function: f, data: v };
	            window.chrome?.webview?.postMessage(JSON.stringify(payload));
	        }
        }
    }
