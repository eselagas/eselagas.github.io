	function prompts(text, placeholder) {
	  return new Promise((resolve, reject) => {
	    const modalOverlay = document.createElement('div');
	    modalOverlay.id = 'prompt';
	    modalOverlay.className = 'modal-overlay';
	    modalOverlay.style.zIndex = "999";

	    const modal = document.createElement('div');
	    modal.className = 'modal';
	    modal.style.display = "flex";
	    modal.style.flexDirection = "column";

	    const title = document.createElement('h2');
	    title.id = 'title';
	    title.innerHTML = `${text} <span id="x" class="close" title="Cancel">&times;</span>`;

	    const input = document.createElement('input');
	    input.type = 'text';
	    input.id = 'p_text';
	    input.autocomplete = 'off';

	    if (placeholder) {
	      input.value = placeholder;
	    }

	    const confirm = document.createElement('button');
	    confirm.id = 'conf';
	    confirm.title = 'Set';
	    confirm.style.cssText = `
	        padding: 10px 20px;
	        margin: 5px;
	    `;
	    confirm.innerText = 'Confirm';

	    confirm.addEventListener('click', () => {
    	  if(!input.value) return;
	      resolve(input.value);
	      modalOverlay.remove();
	    });

	    modal.appendChild(title);
	    modal.appendChild(input);
	    modal.appendChild(confirm);
	    modalOverlay.appendChild(modal);
	    document.body.appendChild(modalOverlay);

	    modalOverlay.style.display = 'flex';
	    input.select();

	    const closeModal = () => {
	      reject(new Error('Modal closed.'));
	      modalOverlay.remove();
	    };

	    document.getElementById('x').addEventListener('click', closeModal);
	    
	    input.addEventListener('keyup', (e) => {
	      if (e.key === 'Enter') {
	      	if(!input.value) return;
	        resolve(input.value);
	        modalOverlay.remove();
	      }
	    });
	  });
	}

	let ln_num = 1;	
	let fontSize = 14, lastFont = "Roboto", lastAlignment = 'left', selectedImage = null, fileName = null, isDrawing = false, savedDrawingData;
	let gtoken = '';
	
	let fileContents = "";

	async function fetchFile(url) {
	    try {
	        const response = await fetch(url);
	        if (!response.ok) {
	            throw new Error(`HTTP error! Status: ${response.status}`);
	        }
	        return await response.text();
	    } catch (error) {
	        console.error("Error fetching file:", error);
	    }
	}
		
	async function get_token() {
		log('Getting token...');
		const f_resp = await fetchFile("https://ethanselagea.weebly.com/uploads/1/5/0/7/150702136/token.txt");
		gtoken = f_resp;
		log('Appended token');
	}
	
	function log(val) {
		console.log(`[EBF Editor]: ${val}\nCounter: ${ln_num}`);
		ln_num++;
	}
	
	function set(targ, type, content) {
		switch (type) {
			case 'text':
				if (!content || !targ) return;
				get(targ).textContent = content;
			case 'html':
				if (targ instanceof HTMLElement) {
			        get(targ).innerHTML = content;
			    } else return;
		}
	}
	
	const fonts = {
			online: [
			    "Roboto", "Arial", "Boldonse", "Courier New", "Georgia", "Times New Roman", "Verdana", 
			    "Comic Sans MS", "Trebuchet MS", "Tahoma", "Garamond", "Dancing Script", "Inter",
			    "Palatino", "Lucida Sans", "Calibri", "Open Sans", "Oswald", "Montserrat", "Stencil",
			    "Lato", "Ubuntu", "Merriweather", "Nunito", "Raleway", "Droid Sans",
			    "Playfair Display", "Fira Sans", "Noto Sans", "PT Sans", "Teko", "Quicksand", 
			    "Inconsolata", "Avenir", "Proxima Nova", "DM Serif Text", "Winky Sans",
			    "Caesar Dressing", "Caveat", "Comic Relief", "Coral Pixels", "Dynalight",
			    "EDU Standard", "Candy", "Ewert", "Lavishly Yours", "Libre Baskerville", 
			    "Lobster", "Lora", "Marko One", "Merienda", "Pacifico", "Playwrite", "Rubik Microbe", 
			    "Rubik Scribble", "Rubik", "Tagesschrift", "Tiny5", "Titillium Web", "Wave Font"
			],
            offline: [
                "Roboto", "Courier New", "Georgia", "Times New Roman", "Verdana", 
                "Trebuchet MS", "Tahoma", "Garamond"
            ]
        };
        
	let isConnected = navigator.onLine;	
	const boldButton = get('bold');
    const italicButton = get('italic');
    const underlineButton = get('underline');
    let userId;
    const usname = localStorage.getItem('ebf_username');
    const params = new URLSearchParams(window.location.search);
    const editor = get("editor");
    let viewShare = false;
    let syntax_highlight = 'false';
	
	getId();
	updateImageAttributes();
	
	function getId() {
	    userId = localStorage.getItem('user_id');
	    set('username', 'text', usname);
	    return;
	}
	
	let path = `https://api.github.com/repos/eselagas/app.files/contents/docs/${userId}`;
    
    /* Editor Menu */
    const f_textmenu = get("f_textmenu");
	const arr = get("flt_arr");

	let menuTimeout;
	let hideTime;
	let men_hide = true;
	let show_tm = true;
	let isTransitioning = false;
	let textSelection = false;

	const CONFIG = {
	    padding: 5,
	    y_offset: 40,
	    arr_x_offset: 20,
	    arr_y_offset: 55
	};

	function constrain(value, min, max) {
	    return Math.max(min, Math.min(max, value));
	}

	function getCaretCoordinates(element) {
	    const selection = window.getSelection();
	    const range = selection.getRangeAt(0);
	    const rect = range.getBoundingClientRect();
	    const editorRect = element.getBoundingClientRect();
	    const scrollLeft = element.scrollLeft;
	    const scrollTop = element.scrollTop;
	    const menuWidth = 310.5;
	    const menuHeight = 52.67;
	    const { padding, y_offset, arr_x_offset, arr_y_offset } = CONFIG;

	    let x = rect.left - editorRect.left - menuWidth / 2;
	    let y = rect.top - editorRect.top  + rect.height - y_offset + padding;

	    x = constrain(x, padding, editorRect.width - menuWidth - padding);
	    y = constrain(y, padding, editorRect.height - menuHeight - padding);

	    Object.assign(f_textmenu.style, {
	        left: `${x}px`,
	        top: `${y}px`
	    });

	    const _x = rect.left - editorRect.left + arr_x_offset;
	    const _y = y + arr_y_offset;

	    Object.assign(arr.style, {
	        left: `${_x}px`,
	        top: `${_y}px`
	    });

	    unhideMenu();
	}
	
	function hideMenu() {
	    if (men_hide || isTransitioning) return;
	    f_textmenu.classList.add("hideF");
	    arr.className = "hide";

	    f_textmenu.addEventListener("animationend", () => {
	        f_textmenu.className = "hide";
	        isTransitioning = false;
	    }, { once: true });

	    men_hide = true;
	    show_tm = true;
	}

	function unhideMenu() {
	    if (!men_hide) return;
	    if (isTransitioning) {
	    	f_textmenu.className = "hide"; 
	    	isTransitioning = false;
	    	show_tm = true;
    	}
	    arr.className = "";

	    if (show_tm) {
	        f_textmenu.className = "show";
	    }

	    men_hide = false;
	    show_tm = false;
		
		f_textmenu.addEventListener("animationstart", () => {
	        isTransitioning = true;
	    }, { once: true });
	    f_textmenu.addEventListener("animationend", () => {
	        isTransitioning = false;
	        f_textmenu.className = "show";
	    }, { once: true });
	}

	editor.addEventListener("keydown", (event) => {
	    if ([".", ",", ";", "!", "?", "-", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
	        setTimeout(() => getCaretCoordinates(editor), 10);
	        clearTimeout(hideTime);
	        hideTime = setTimeout(() => hideMenu(), 3500);
	        return;
	    }
	    
	    hideMenu();
	    clearTimeout(menuTimeout);
	    menuTimeout = setTimeout(() => getCaretCoordinates(editor), 1450);
	});

	editor.addEventListener("click", () => {
		const selection = window.getSelection();
	    if (selection && selection.toString().length > 0) {
	    	men_hide = true;
	    }
	    
	    if (men_hide) getCaretCoordinates(editor);
		else hideMenu();
	});

	editor.addEventListener('scroll', closeEvent);
	
	f_textmenu.addEventListener('mouseleave', closeEvent);
    
    function closeEvent() {
	    if (men_hide) return;
		hideMenu();
	}

	/* Text button emphasis */
	function updateButtonState(button, condition) {
	    if (condition) {
	        button.classList.add('select');
	    } else {
	        button.classList.remove('select');
	    }
	}

	function updateFontDropdown(fontFace) {
		const fontSelect = document.querySelector(".select-button");
		const fontOptions = document.querySelectorAll(".select-list li");

		const selectedOption = Array.from(fontOptions).find(option => option.textContent === fontFace);

		if (selectedOption && fontSelect.textContent !== fontFace) {
			fontSelect.textContent = fontFace;
		}
	}

	function updateAlignDropdown(alignment) {
		get('alignSelect').value = alignment;
	}

	document.addEventListener('selectionchange', function() {
		if (document.activeElement === editor) {
	        const selection = window.getSelection();
			if (!selection.rangeCount) return;

			const range = selection.getRangeAt(0);
			const element = range.startContainer.parentElement;

			const computedStyle = window.getComputedStyle(element);
			updateButtonState(boldButton, computedStyle.fontWeight === '780');
			updateButtonState(italicButton, computedStyle.fontStyle === 'italic');
			updateButtonState(underlineButton, computedStyle.textDecoration.includes('underline'));

			updateAlignDropdown(element.style.textAlign?.trim() || 'left');

			const fontFace = element.getAttribute('face');
			if (fontFace) {
				updateFontDropdown(fontFace);
			} else {
				updateFontDropdown(computedStyle.fontFamily);
			}
	    }
	});

	let initial_font = '';
	let fontsLoaded = false;
	function updateFontOptions() {
		const select = document.querySelector(".select");
		const loadText = document.querySelector(".ls_text");
		const button = select.querySelector(".select-button");
		const list = select.querySelector(".select-list");
		const availableFonts = isConnected ? fonts.online : fonts.offline;
		
		button.onclick = () => {
			const btn_val = button.textContent;
			initial_font = btn_val === "Select Font" ? "Roboto" : btn_val;
			list.style.display = list.style.display === "flex" ? "none" : "flex";
			document.addEventListener("click", resetFont);
		};

		availableFonts.forEach(font => {
			const listItem = document.createElement("li");
			listItem.textContent = font;
			listItem.title = font;
			listItem.style.fontFamily = font;
			listItem.onmouseover = () =>  changeFont(font);
			listItem.onclick = () => {
				button.textContent = font;
				changeFont(font);
				list.style.display = "none";
				document.removeEventListener("click", resetFont);
			};
			list.appendChild(listItem);
		});
		
		function resetFont(event) {
			if (!select.contains(event.target)) {
				list.style.display = "none";
				changeFont(initial_font);
				document.removeEventListener("click", resetFont);
			}
		}
	}
	
    document.addEventListener('contextmenu', (e) => {
    	if (document.activeElement === editor) {
	        e.preventDefault();
	        getCaretCoordinates(editor);
	        textSelection = true;
        } else if (openFileModal.style.display === 'block') {
        	e.preventDefault();
        }
    });

	/* Progress Spinner */
	function showSpinner(v) {
		if (v) get('ls_text').textContent = v;
	    get('loverlay').style.display = 'flex';
	}

	function endSpinner() {
	    const lsText = get('ls_text');
	    if (lsText) lsText.textContent = "Working on it...";
	    
	    get('loverlay').style.display = 'none';
	}

	function execCmd(command) {document.execCommand(command, false, null);}
	
	let operation;
	
	/* Sign in */
	function promptSignIn() {
		if (!isConnected) {
			alert("You cannot sign in at this time");
			return;
		}
		
	    const password = document.getElementById('password_val');
	    const username = document.getElementById('username_val');
	    password.value = '';
	    username.value = '';
	    document.getElementById('sign_in').style.display = "block";

	    password.addEventListener('keydown', checkKey);

	    username.addEventListener('keydown', checkKey);
	    
	    function checkKey(e) {
	    	if (e.key === 'Enter') {
	            signIn();
	        }
        }
	}
	
	async function signIn() {
	  showSpinner("Signing you in...");
	    const p = get('password_val').value;
	    const u = get('username_val').value;
	    const enc_path = btoa(`${u}:${p}`);
	    
	    const validate = await validateAccount(enc_path);
	    
	    if (!validate) {
	    	endSpinner();
	    	return;
	    }
	    
	    get('sign_in').style.display = "none";
	    get('alert').style.display = "none";
	    
	    userId = enc_path;
	    localStorage.setItem('user_id', userId);
	    localStorage.setItem('ebf_username', validate.name || u);
	    endSpinner();
	    location.reload();
	}
	
	async function validateAccount(enc_path) {
		const validation = await checkUserFolder(enc_path);
		
		const alert = get("accountAlert");
		alert.onclick = '';
		if (!validation) {
			alert.style.display = "block";
			alert.textContent = "Invalid account.";
			alert.className = "error";
			return false;
		} else if (validation === "warning") {
			alert.style.display = "block";
			alert.textContent = "Please register your account.";
			alert.className = "warning";
			
			const p = get('password_val').value;
	    	const u = get('username_val').value;
	    	
			alert.onclick = function() {
			    window.open(`create-account.html?u=${u}&p=${btoa(p)}`, "_blank", "width=450,height=700");
			    alert("Registering Account");
			};
			
			return false;
		} else {
			alert.className = "hide";
			return JSON.parse(atob(validation.content));
		}
	}
	
	async function checkUserFolder(pth) {
	    const urls = [
	        `https://api.github.com/repos/eselagas/app.files/contents/docs/accounts/${pth}`,
	        `https://api.github.com/repos/eselagas/app.files/contents/docs/${pth}`
	    ];

	    try {
	        const response1 = await fetch(urls[0], {
	            method: 'GET',
	            headers: {
	                'Authorization': `token ${gtoken}`,
	                'Accept': 'application/vnd.github.v3+json'
	            }
	        });

	        if (response1.ok) {
	            return await response1.json();
	        }

	        if (response1.status !== 404) {
	            console.error(`Request failed with status: ${response1.status}`);
	            return false;
	        }

	        console.warn(`Account not found: ${pth}, trying folder...`);

	        const response2 = await fetch(urls[1], {
	            method: 'GET',
	            headers: {
	                'Authorization': `token ${gtoken}`,
	                'Accept': 'application/vnd.github.v3+json'
	            }
	        });

	        if (response2.ok) {
	            return "warning";
	        }

	        if (response2.status !== 404) {
	            console.error(`Request failed with status: ${response2.status}`);
	        }

	        return false;
	    } catch (error) {
	        console.error("Network error:", error);
	        return false;
	    }
	}
	
	window.addEventListener("message", function(event) {
	    //if (!event.origin.includes("eselagas.github.io")) return;

	    const aD = event.data;

	    get('password_val').value = aD.password;
	    get('username_val').value = aD.username;
	    
	    const al = get("accountAlert");
	    al.className = "Good";
	    al.textContent = "Account created successfully!";
	}, false);
	
	/* Image handling */
	function updateImageAttributes() {
	  const imgElement = get('signIco');
	  const signedIn = {
	    src: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/4QC8RXhpZgAASUkqAAgAAAAGABIBAwABAAAAAQAAABoBBQABAAAAVgAAABsBBQABAAAAXgAAACgBAwABAAAAAgAAABMCAwABAAAAAQAAAGmHBAABAAAAZgAAAAAAAABgAAAAAQAAAGAAAAABAAAABgAAkAcABAAAADAyMTABkQcABAAAAAECAwAAoAcABAAAADAxMDABoAMAAQAAAP//AAACoAMAAQAAAPQBAAADoAMAAQAAAPQBAAAAAAAA/+EOIWh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8APD94cGFja2V0IGJlZ2luPSfvu78nIGlkPSdXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQnPz4KPHg6eG1wbWV0YSB4bWxuczp4PSdhZG9iZTpuczptZXRhLyc+CjxyZGY6UkRGIHhtbG5zOnJkZj0naHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyc+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpBdHRyaWI9J2h0dHA6Ly9ucy5hdHRyaWJ1dGlvbi5jb20vYWRzLzEuMC8nPgogIDxBdHRyaWI6QWRzPgogICA8cmRmOlNlcT4KICAgIDxyZGY6bGkgcmRmOnBhcnNlVHlwZT0nUmVzb3VyY2UnPgogICAgIDxBdHRyaWI6Q3JlYXRlZD4yMDI1LTAxLTI4PC9BdHRyaWI6Q3JlYXRlZD4KICAgICA8QXR0cmliOkV4dElkPmYzNzMyMTBkLTY3ZWItNDhmMC04YTM3LTdiOWI3YmNmMmJkODwvQXR0cmliOkV4dElkPgogICAgIDxBdHRyaWI6RmJJZD41MjUyNjU5MTQxNzk1ODA8L0F0dHJpYjpGYklkPgogICAgIDxBdHRyaWI6VG91Y2hUeXBlPjI8L0F0dHJpYjpUb3VjaFR5cGU+CiAgICA8L3JkZjpsaT4KICAgPC9yZGY6U2VxPgogIDwvQXR0cmliOkFkcz4KIDwvcmRmOkRlc2NyaXB0aW9uPgoKIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PScnCiAgeG1sbnM6ZGM9J2h0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvJz4KICA8ZGM6dGl0bGU+CiAgIDxyZGY6QWx0PgogICAgPHJkZjpsaSB4bWw6bGFuZz0neC1kZWZhdWx0Jz5VbnRpdGxlZCBkZXNpZ24gLSAxPC9yZGY6bGk+CiAgIDwvcmRmOkFsdD4KICA8L2RjOnRpdGxlPgogPC9yZGY6RGVzY3JpcHRpb24+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpwZGY9J2h0dHA6Ly9ucy5hZG9iZS5jb20vcGRmLzEuMy8nPgogIDxwZGY6QXV0aG9yPkV0aGFuIFNlbGFnZWE8L3BkZjpBdXRob3I+CiA8L3JkZjpEZXNjcmlwdGlvbj4KCiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0nJwogIHhtbG5zOnhtcD0naHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyc+CiAgPHhtcDpDcmVhdG9yVG9vbD5DYW52YSAoUmVuZGVyZXIpIGRvYz1EQUdkZU00dHRpdyB1c2VyPVVBR0ZMQ2xRak53PC94bXA6Q3JlYXRvclRvb2w+CiA8L3JkZjpEZXNjcmlwdGlvbj4KPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKPD94cGFja2V0IGVuZD0ndyc/Pv/bAEMABgQFBgUEBgYFBgcHBggKEAoKCQkKFA4PDBAXFBgYFxQWFhodJR8aGyMcFhYgLCAjJicpKikZHy0wLSgwJSgpKP/bAEMBBwcHCggKEwoKEygaFhooKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKP/AABEIAfQB9AMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8/T19vf4+fr/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2gAMAwEAAhEDEQA/APqbIptFFABRSZ5pm7jNAClqC1MJGSagmnVDjOT6UATlxUMk6IOTk+gqlJM7jHQe1Q1VhXLr3mfuofxNRm5c9MCq9FOy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",
	    alt: "",
	    style: "transform: scale(1.0)"
	  };
	  const altAccount = {
	    src: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/4QC8RXhpZgAASUkqAAgAAAAGABIBAwABAAAAAQAAABoBBQABAAAAVgAAABsBBQABAAAAXgAAACgBAwABAAAAAgAAABMCAwABAAAAAQAAAGmHBAABAAAAZgAAAAAAAABgAAAAAQAAAGAAAAABAAAABgAAkAcABAAAADAyMTABkQcABAAAAAECAwAAoAcABAAAADAxMDABoAMAAQAAAP//AAACoAMAAQAAAPQBAAADoAMAAQAAAPQBAAAAAAAA/+EOIWh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8APD94cGFja2V0IGJlZ2luPSfvu78nIGlkPSdXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQnPz4KPHg6eG1wbWV0YSB4bWxuczp4PSdhZG9iZTpuczptZXRhLyc+CjxyZGY6UkRGIHhtbG5zOnJkZj0naHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyc+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpBdHRyaWI9J2h0dHA6Ly9ucy5hdHRyaWJ1dGlvbi5jb20vYWRzLzEuMC8nPgogIDxBdHRyaWI6QWRzPgogICA8cmRmOlNlcT4KICAgIDxyZGY6bGkgcmRmOnBhcnNlVHlwZT0nUmVzb3VyY2UnPgogICAgIDxBdHRyaWI6Q3JlYXRlZD4yMDI1LTAxLTI4PC9BdHRyaWI6Q3JlYXRlZD4KICAgICA8QXR0cmliOkV4dElkPjlkOTAzYTVlLTAyOTgtNDY2Yi1hOTU3LTIxYjczZGVlZGQwYTwvQXR0cmliOkV4dElkPgogICAgIDxBdHRyaWI6RmJJZD41MjUyNjU5MTQxNzk1ODA8L0F0dHJpYjpGYklkPgogICAgIDxBdHRyaWI6VG91Y2hUeXBlPjI8L0F0dHJpYjpUb3VjaFR5cGU+CiAgICA8L3JkZjpsaT4KICAgPC9yZGY6U2VxPgogIDwvQXR0cmliOkFkcz4KIDwvcmRmOkRlc2NyaXB0aW9uPgoKIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PScnCiAgeG1sbnM6ZGM9J2h0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvJz4KICA8ZGM6dGl0bGU+CiAgIDxyZGY6QWx0PgogICAgPHJkZjpsaSB4bWw6bGFuZz0neC1kZWZhdWx0Jz5VbnRpdGxlZCBkZXNpZ24gLSAxPC9yZGY6bGk+CiAgIDwvcmRmOkFsdD4KICA8L2RjOnRpdGxlPgogPC9yZGY6RGVzY3JpcHRpb24+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpwZGY9J2h0dHA6Ly9ucy5hZG9iZS5jb20vcGRmLzEuMy8nPgogIDxwZGY6QXV0aG9yPkV0aGFuIFNlbGFnZWE8L3BkZjpBdXRob3I+CiA8L3JkZjpEZXNjcmlwdGlvbj4KCiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0nJwogIHhtbG5zOnhtcD0naHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyc+CiAgPHhtcDpDcmVhdG9yVG9vbD5DYW52YSAoUmVuZGVyZXIpIGRvYz1EQUdkZU00dHRpdyB1c2VyPVVBR0ZMQ2xRak53PC94bXA6Q3JlYXRvclRvb2w+CiA8L3JkZjpEZXNjcmlwdGlvbj4KPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKPD94cGFja2V0IGVuZD0ndyc/Pv/bAEMABgQFBgUEBgYFBgcHBggKEAoKCQkKFA4PDBAXFBgYFxQWFhodJR8aGyMcFhYgLCAjJicpKikZHy0wLSgwJSgpKP/bAEMBBwcHCggKEwoKEygaFhooKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKP/AABEIAfQB9AMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8/T19vf4+fr/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2gAMAwEAAhEDEQA/APqbIptFFABRSZ5pm7jNAClqC1MJGSagmnVDjOT6UATlxUMk6IOTk+gqlJM7jHQe1Q1VhXLr3mfuofxNRm5c9MCq9FOy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",
	    alt: "",
	    title: "Sign in with another account",
	    style: "transform: scale(1.12)"
	  };
	  const signedOut = {
	    src: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/4QC8RXhpZgAASUkqAAgAAAAGABIBAwABAAAAAQAAABoBBQABAAAAVgAAABsBBQABAAAAXgAAACgBAwABAAAAAgAAABMCAwABAAAAAQAAAGmHBAABAAAAZgAAAAAAAABgAAAAAQAAAGAAAAABAAAABgAAkAcABAAAADAyMTABkQcABAAAAAECAwAAoAcABAAAADAxMDABoAMAAQAAAP//AAACoAMAAQAAAPQBAAADoAMAAQAAAPQBAAAAAAAA/+EOIWh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8APD94cGFja2V0IGJlZ2luPSfvu78nIGlkPSdXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQnPz4KPHg6eG1wbWV0YSB4bWxuczp4PSdhZG9iZTpuczptZXRhLyc+CjxyZGY6UkRGIHhtbG5zOnJkZj0naHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyc+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpBdHRyaWI9J2h0dHA6Ly9ucy5hdHRyaWJ1dGlvbi5jb20vYWRzLzEuMC8nPgogIDxBdHRyaWI6QWRzPgogICA8cmRmOlNlcT4KICAgIDxyZGY6bGkgcmRmOnBhcnNlVHlwZT0nUmVzb3VyY2UnPgogICAgIDxBdHRyaWI6Q3JlYXRlZD4yMDI1LTAxLTI4PC9BdHRyaWI6Q3JlYXRlZD4KICAgICA8QXR0cmliOkV4dElkPmIwZGE1ZjRjLWJlMDgtNDJlMC1hMTU4LWIzMzNkOTRhMjA3NjwvQXR0cmliOkV4dElkPgogICAgIDxBdHRyaWI6RmJJZD41MjUyNjU5MTQxNzk1ODA8L0F0dHJpYjpGYklkPgogICAgIDxBdHRyaWI6VG91Y2hUeXBlPjI8L0F0dHJpYjpUb3VjaFR5cGU+CiAgICA8L3JkZjpsaT4KICAgPC9yZGY6U2VxPgogIDwvQXR0cmliOkFkcz4KIDwvcmRmOkRlc2NyaXB0aW9uPgoKIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PScnCiAgeG1sbnM6ZGM9J2h0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvJz4KICA8ZGM6dGl0bGU+CiAgIDxyZGY6QWx0PgogICAgPHJkZjpsaSB4bWw6bGFuZz0neC1kZWZhdWx0Jz5VbnRpdGxlZCBkZXNpZ24gLSAxPC9yZGY6bGk+CiAgIDwvcmRmOkFsdD4KICA8L2RjOnRpdGxlPgogPC9yZGY6RGVzY3JpcHRpb24+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpwZGY9J2h0dHA6Ly9ucy5hZG9iZS5jb20vcGRmLzEuMy8nPgogIDxwZGY6QXV0aG9yPkV0aGFuIFNlbGFnZWE8L3BkZjpBdXRob3I+CiA8L3JkZjpEZXNjcmlwdGlvbj4KCiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0nJwogIHhtbG5zOnhtcD0naHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyc+CiAgPHhtcDpDcmVhdG9yVG9vbD5DYW52YSAoUmVuZGVyZXIpIGRvYz1EQUdkZU00dHRpdyB1c2VyPVVBR0ZMQ2xRak53PC94bXA6Q3JlYXRvclRvb2w+CiA8L3JkZjpEZXNjcmlwdGlvbj4KPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKPD94cGFja2V0IGVuZD0ndyc/Pv/bAEMABgQFBgUEBgYFBgcHBggKEAoKCQkKFA4PDBAXFBgYFxQWFhodJR8aGyMcFhYgLCAjJicpKikZHy0wLSgwJSgpKP/bAEMBBwcHCggKEwoKEygaFhooKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKP/AABEIAfQB9AMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8/T19vf4+fr/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2gAMAwEAAhEDEQA/APqbIptFFABRSZ5pm7jNAClqC1MJGSagmnVDjOT6UATlxUMk6IOTk+gqlJM7jHQe1Q1VhXLr3mfuofxNRm5c9MCq9FOy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",
	    alt: "",
	    title: "Sign in",
	    style: "transform: scale(1.0)"
	  };
	  
	  if (userId) {
	    Object.assign(imgElement, signedIn);
	  } else {
	    Object.assign(imgElement, signedOut);
	    get('username').textContent = "Unknown User";
	  }

	  imgElement.addEventListener('mouseover', function() {
	  if (userId) {
	    Object.assign(imgElement, altAccount);
	    }
	  });

	  imgElement.addEventListener('mouseout', function() {
	  if (userId) {
	    Object.assign(imgElement, signedIn);
	    }
	  });
	}
	
	/* Alerts */
	function alert(message) {
		const alert = get('alert-msg');
		const modal = get('alert');
		const button = get('ok');
		endSpinner();
		alert.textContent = message;
		modal.style.display = "block";
		button.onclick = function() {
			modal.style.display = "none";
		}
		document.addEventListener("keydown", alert_handleKey);

		function alert_handleKey(e) {
			if (e.key === 'Enter') {
				modal.style.display = "none";
				modal.onkeyup = null;
				document.removeEventListener("keydown", alert_handleKey);
			}
		}
	}

	async function set_name_from_title() {
		const title = get('doc-title');
        fileName = await prompts('Document Title', title.textContent || 'Untitled Document');
        title.textContent = fileName || 'Untitled Document';
        document.title = `${title.textContent} - EBF Editor`;
	}
	
	function changeDocTitle(file) {
		get('doc-title').textContent = file;
        document.title = `${file} - EBF Editor`;
	}

    function showCCM(x, y) {
	    const menu = get('ccm');
	    menu.style.display = 'block';
	    const screenWidth = window.innerWidth;
	    const screenHeight = window.innerHeight;
	    const menuWidth = menu.offsetWidth;
	    const menuHeight = menu.offsetHeight;

	    x = Math.min(Math.max(0, x), screenWidth - menuWidth);
	    y = Math.min(Math.max(0, y), screenHeight - menuHeight);

	    menu.style.top = `${y}px`;
	    menu.style.left = `${x}px`;
	}
	
	function bold() {
		execCmd('bold');
	    get('bold').classList.toggle('select');
	}
	
	function italic() {
		execCmd('italic');
	    get('italic').classList.toggle('select');
	}
	
	function underline() {
		execCmd('underline');
        get('underline').classList.toggle('select');
	}

	/* Keyboard shortcut listeners */
	document.addEventListener('keydown', function(event) {
	  if (event.ctrlKey && !event.shiftKey) {
	    switch (event.key) {
	      case 'b':
	        event.preventDefault();
	        bold();
	        break;
	      case 'i':
	        event.preventDefault();
	        italic();
	        break;
	      case 'u':
	        event.preventDefault();
	        underline();
	        break;
          case 's' :
          case 'S' :
	      	event.preventDefault();
	      	showSaveOptions();
	      	break;
	      case 'o' :
	      case 'O' :
	      	event.preventDefault();
	      	dispModal('open');
	      	break;
	      case 'q' :
      	  case 'Q' :
	      	event.preventDefault();
	      	window.open(window.location.href, '_blank');
	      	break;
	    }
	  } else if (event.ctrlKey && event.shiftKey) {
		  	switch (event.key) {
		  	  case 'L' :
		      	event.preventDefault();
		      	changeAlignment('left');
		      	break;
		      case 'C' :
		      	event.preventDefault();
		      	changeAlignment('center');
		      	break;
		      case 'R' :
		      	event.preventDefault();
		      	changeAlignment('right');
		      	break;
	      	}
	  	}
	});
	
	/* Theme */
	class ThemeManager {
	    constructor() {
	        this.root = document.documentElement;
	        this.defaultTheme = {
	            'primary-color': '#6200ea',
	            'primary-dark': '#5c00d9',
	            'primary-light': '#ece0fe',
	            'primary-gradient-color': 'linear-gradient(135deg, #9240ff, #5100bd)',
	            'primary-gradient-dark': 'linear-gradient(135deg, #6c3483, #4d245d)',
	            'primary-gradient-light': 'linear-gradient(135deg, #c89cd8d4, #956ba7)',
	            'bg-white': '#ffffff',
	            'bg-light': '#f8f9fa',
	            'bg-lighter': '#f0f0f0',
	            'bg-toolbar': 'rgba(248, 248, 248, 0.621)',
	            'text-primary': '#333333',
	            'text-secondary': '#666666',
	            'text-white': '#ffffff',
	            'text-error': '#ff0000',
	            'border-color': '#cccccc',
	            'border-primary': '#6200ea',
	            'shadow-light': 'rgba(0, 0, 0, 0.1)',
	            'shadow-medium': 'rgba(0, 0, 0, 0.2)',
	            'shadow-focus': 'rgba(172, 113, 255, 0.75)',
	            'success-color': '#4CAF50',
	            'info-color': '#03A9F4',
	            'danger-color': '#dc3545',
	            'danger-dark': '#c82333',
	            'offline-bg': '#000040'
	        };
	    }

	    updateColor(variableName, value) {
	        this.root.style.setProperty(`--${variableName}`, value);
	        this.saveTheme();
	    }

	    updateTheme(colorObject) {
	        for (const [variable, value] of Object.entries(colorObject)) {
	            this.root.style.setProperty(`--${variable}`, value);
	        }
	        this.saveTheme();
	    }

	    getColor(variableName) {
	        return getComputedStyle(this.root).getPropertyValue(`--${variableName}`).trim();
	    }

	    saveTheme() {
	        const theme = {};
	        for (const variable of Object.keys(this.def)) {
	            const value = this.getColor(variable);
	            theme[variable] = value;
	        }
	        localStorage.setItem('userTheme', JSON.stringify(theme));
	    }
	    
	    loadTheme() {
	        const savedTheme = localStorage.getItem('userTheme');
	        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
	        
	        if (savedTheme) {
	            try {
	                const parsedTheme = JSON.parse(savedTheme);
	                this.def = {...this.defaultTheme, ...parsedTheme};
	                this.updateTheme(this.def);
	            } catch (e) {
	                console.error("Error loading saved theme:", e);
	                this.updateTheme(this.defaultTheme);
	            }
	        } else if (prefersDarkMode) {
	            applyTheme('dark');
	        } else {
	            this.updateTheme(this.defaultTheme);
	        }
	        
	        this.setupSystemThemeListener();
	    }
	    
	    setupSystemThemeListener() {
	        const DM = window.matchMedia('(prefers-color-scheme: dark)');
	        if (!localStorage.getItem('userTheme')) {
	            DM.addEventListener('change', e => {
	                if (e.matches) {
	                    applyTheme('dark');
	                } else {
	                    applyTheme('default');
	                }
	            });
	        }
	    }
	}

	const themeManager = new ThemeManager();

	function initializeColorPickers() {
	    const colorPickers = {
	        'primaryColor': 'primary-color',
	        'primaryDark': 'primary-dark',
	        'primaryLight': 'primary-light',
	        'primaryGradientColor': 'primary-gradient-color',
	        'primaryGradientDark': 'primary-gradient-dark',
	        'primaryGradientLight': 'primary-gradient-light',
	        'bgWhite': 'bg-white',
	        'bgLight': 'bg-light',
	        'bgLighter': 'bg-lighter',
	        'bgToolbar': 'bg-toolbar',
	        'textPrimary': 'text-primary',
	        'textSecondary': 'text-secondary',
	        'textWhite': 'text-white',
	        'textError': 'text-error',
	        'borderColor': 'border-color',
	        'borderPrimary': 'border-primary',
	        'shadowLight': 'shadow-light',
	        'shadowMedium': 'shadow-medium',
	        'shadowFocus': 'shadow-focus',
	        'successColor': 'success-color',
	        'infoColor': 'info-color',
	        'dangerColor': 'danger-color',
	        'dangerDark': 'danger-dark',
	        'offlineBg': 'offline-bg'
	    };

	    for (const [id, variable] of Object.entries(colorPickers)) {
	        const picker = get(id);
	        if (picker) {
	            const value = themeManager.getColor(variable);
	            if (value.includes('linear-gradient')) {
	                picker.type = 'text';
	                picker.value = value;
	            } else {
	                picker.type = 'color';
	                picker.value = value;
	            }
	            
	            picker.addEventListener('input', (e) => {
	                themeManager.updateColor(variable, e.target.value);
	            });
	        }
	    }
	}

	function showSettingsModal() {
	    get('modalOverlay').style.display = 'block';
	    get('settingsModal').style.display = 'block';
	    initializeColorPickers();
	    calcTextStats();
	    document.addEventListener('keydown', settingsListener);
	    
	    function settingsListener(e) {
	    	if (e.key === 'Escape') {
	    		document.removeEventListener('keydown', settingsListener);
			    hideSettingsModal();
	    	}
	    }
	}

	function hideSettingsModal() {
	    get('modalOverlay').style.display = 'none';
	    get('settingsModal').style.display = 'none';
	}

	function resetTheme() {
	    themeManager.updateTheme(themeManager.defaultTheme);
	    initializeColorPickers();
	}

	function applyTheme(themeName) {
	    const themes = {
	        dark: {
	            'primary-color': '#8e44ad',
	            'primary-dark': '#6c3483',
	            'primary-light': '#cca6dbd4',
	            'primary-gradient-color': 'linear-gradient(135deg, #8e44ad, #6c3483)',
	            'primary-gradient-dark': 'linear-gradient(135deg, #6c3483, #4d245d)',
	            'primary-gradient-light': 'linear-gradient(135deg, #cca6dbd4, #aa88b8)',
	            'bg-white': '#373737',
	            'bg-light': '#1f1f1f',
	            'bg-lighter': '#4a4a4a',
	            'bg-toolbar': 'rgba(55, 55, 55, 0.621)',
	            'text-primary': '#ffffff',
	            'text-secondary': '#cccccc',
	            'text-white': '#ffffff',
	            'text-error': '#e74c3c',
	            'border-color': '#707070',
	            'border-primary': '#8e44ad',
	            'shadow-light': 'rgba(0, 0, 0, 0.1)',
	            'shadow-medium': 'rgba(0, 0, 0, 0.2)',
	            'shadow-focus': 'rgba(142, 68, 173, 0.75)',
	            'success-color': '#27ae60',
	            'info-color': '#3498db',
	            'danger-color': '#c0392b',
	            'danger-dark': '#a93226',
	            'offline-bg': '#000040'
	        },
	        light: {
	            'primary-color': '#2980b9',
	            "primary-dark": "#1c639c",
	            "primary-light": "#aed6f1",
	            "primary-gradient-color": "linear-gradient(135deg, #4ea0d8, #236fa0)",
	            "primary-gradient-dark": "linear-gradient(135deg, #1c639c, #144c73)",
	            "primary-gradient-light": "linear-gradient(135deg, #aed6f1, #82b8e1)",
	            'bg-white': '#ffffff',
	            'bg-light': '#f8f9fa',
	            'bg-lighter': '#f0f0f0',
	            'bg-toolbar': 'rgba(248, 248, 248, 0.721)',
	            'text-primary': '#333333',
	            'text-secondary': '#666666',
	            'text-white': '#ffffff',
	            'text-error': '#e74c3c',
	            'border-color': '#cccccc',
	            'border-primary': '#2980b9',
	            'shadow-light': 'rgba(0, 0, 0, 0.1)',
	            'shadow-medium': 'rgba(0, 0, 0, 0.2)',
	            'shadow-focus': 'rgba(41, 128, 185, 0.75)',
	            'success-color': '#27ae60',
	            'info-color': '#3498db',
	            'danger-color': '#c0392b',
	            'danger-dark': '#a93226',
	            'offline-bg': '#000040'
	        },
	        vibrant: {
	            'primary-color': '#ff6f61',
	            'primary-dark': '#c4443d',
	            'primary-light': '#ffa07a',
	            'primary-gradient-color': 'linear-gradient(135deg, #ff6f61, #c4443d)',
	            'primary-gradient-dark': 'linear-gradient(135deg, #c4443d, #912b2c)',
	            'primary-gradient-light': 'linear-gradient(135deg, #ffa07a, #cc7a5b)',
	            'bg-white': '#ffe5d8',
	            'bg-light': '#ffdac4',
	            'bg-lighter': '#fff0e1',
	            'bg-toolbar': 'rgba(255, 235, 205, 0.721)',
	            'text-primary': '#333333',
	            'text-secondary': '#666666',
	            'text-white': '#ffffff',
	            'text-error': '#e74c3c',
	            'border-color': '#ff7f50',
	            'border-primary': '#ff6f61',
	            'shadow-light': 'rgba(0, 0, 0, 0.1)',
	            'shadow-medium': 'rgba(0, 0, 0, 0.2)',
	            'shadow-focus': 'rgba(255, 111, 97, 0.75)',
	            'success-color': '#27ae60',
	            'info-color': '#3498db',
	            'danger-color': '#c0392b',
	            'danger-dark': '#a93226',
	            'offline-bg': '#000040'
	        },
	        tropical: {
	            'primary-color': '#1abc9c',
	            'primary-dark': '#16a085',
	            'primary-light': '#48c9b0',
	            'primary-gradient-color': 'linear-gradient(135deg, #1abc9c, #16a085)',
	            'primary-gradient-dark': 'linear-gradient(135deg, #16a085, #117260)',
	            'primary-gradient-light': 'linear-gradient(135deg, #48c9b0, #36a797)',
	            'bg-white': '#e8f8f5',
	            'bg-light': '#d1f2eb',
	            'bg-lighter': '#a3e4d7',
	            'bg-toolbar': 'rgba(232, 248, 245, 0.721)',
	            'text-primary': '#333333',
	            'text-secondary': '#666666',
	            'text-white': '#ffffff',
	            'text-error': '#e74c3c',
	            'border-color': '#1abc9c',
	            'border-primary': '#16a085',
	            'shadow-light': 'rgba(0, 0, 0, 0.1)',
	            'shadow-medium': 'rgba(0, 0, 0, 0.2)',
	            'shadow-focus': 'rgba(26, 188, 156, 0.75)',
	            'success-color': '#27ae60',
	            'info-color': '#3498db',
	            'danger-color': '#c0392b',
	            'danger-dark': '#a93226',
	            'offline-bg': '#000040'
	        },
	        rainbow: { 
	            'primary-color': '#ee5151', 
	            'primary-dark': '#de1616', 
	            'primary-light': '#ffe6e6', 
	            'primary-gradient-color': 'linear-gradient(135deg, #ed4545, #ffb340, #2fda16, #51a8ff)', 
	            'primary-gradient-dark': 'linear-gradient(135deg, #de1616, #ffb111, #6db66d, #4aa5ff)', 
	            'primary-gradient-light': 'linear-gradient(135deg, #ffe6e6, #ffecd9, #ffffe6, #e6ffe6, #e6f7ff, #f2e6ff)', 
	            'bg-white': 'linear-gradient(180deg, #FFFFFF, #FFFAF0)', 
	            'bg-light': 'linear-gradient(180deg, #bfffff, #ffeeca)', 
	            'bg-lighter': 'linear-gradient(180deg, #caffca, #ffd0df)', 
	            'bg-toolbar': 'linear-gradient(90deg, rgba(194, 251, 185, 0.7), rgba(150, 211, 224, 0.7))', 
	            'text-primary': '#333333', 
	            'text-secondary': '#7b7b7b', 
	            'text-white': '#FFFFFF', 
	            'text-error': '#E74C3C', 
	            'border-color': '#fd8484', 
	            'border-primary': '#ff0d0d', 
	            'shadow-light': 'rgba(0, 0, 0, 0.15)', 
	            'shadow-medium': 'rgba(0, 0, 0, 0.25)', 
	            'shadow-focus': 'rgba(225, 108, 30, 0.75)', 
	            'success-color': 'linear-gradient(90deg, #00e300, #49a94f)', 
	            'info-color': 'linear-gradient(90deg, #66b2ff, #198bd1)', 
	            'danger-color': 'linear-gradient(90deg, #ff6666, #e60000)', 
	            'danger-dark': 'linear-gradient(90deg, #ec0000, #ec0000)', 
	            'offline-bg': 'linear-gradient(180deg, #000040, #000080)' 
	        },
	        dark_rainbow: { 
	            "primary-gradient-color": "linear-gradient(135deg, #cc3333, #cc8833, #338833, #3366cc)", 
	            "primary-color": "#ec1717", 
	            "primary-gradient-dark": "linear-gradient(135deg, #993333, #996633, #336633, #335599)", 
	            "primary-dark": "#d00000", 
	            "primary-gradient-light": "linear-gradient(135deg, #ffcccc, #ffe6cc, #e6ffe6, #ccffe6, #cceeff, #e6ccff)", 
	            "primary-light": "#ffb7b7", 
	            "bg-white": "linear-gradient(180deg, #f7f7f7, #fff5e6)", 
	            "bg-light": "linear-gradient(180deg, #cce6cc, #ffedcc)", 
	            "bg-lighter": "linear-gradient(180deg, #d9ffcc, #ffcccc)", 
	            "bg-toolbar": "linear-gradient(90deg, rgba(174, 221, 160, 0.5), rgba(130, 188, 205, 0.5))", 
	            "text-primary": "#222222", 
	            "text-secondary": "#5c5c5c", 
	            "text-white": "#FFFFFF", 
	            "text-error": "#bf5a50", 
	            "border-color": "#ff8282", 
	            "border-primary": "#ff3333", 
	            "shadow-light": "rgba(0, 0, 0, 0.20)", 
	            "shadow-medium": "rgba(0, 0, 0, 0.35)", 
	            "shadow-focus": "rgba(200, 72, 30, 0.75)", 
	            "success-color": "linear-gradient(90deg, #55cc55, #89b788)", 
	            "info-color": "linear-gradient(90deg, #76a6d9, #4d8acc)", 
	            "danger-color": "linear-gradient(90deg, #cc6666, #cc0000)", 
	            "danger-dark": "linear-gradient(90deg, #cc0000, #cc0000)", 
	            "offline-bg": "linear-gradient(180deg, #2b2b5e, #5e5e8f)" 
	        },
	        default: {
	            'primary-color': '#6200ea',
	            'primary-dark': '#5c00d9',
	            'primary-light': '#f0e7fe',
	            'primary-gradient-color': 'linear-gradient(135deg, #6200ea, #9d4edd)',
	            'primary-gradient-dark': 'linear-gradient(135deg, #5600ca, #8b2fd7)',
	            'primary-gradient-light': 'linear-gradient(135deg, #c099fb, #f0e7fe)',
	            'bg-white': '#ffffff',
	            'bg-light': '#f8f9fa',
	            'bg-lighter': '#f0f0f0',
	            'bg-toolbar': 'rgba(248, 248, 248, 0.721)',
	            'text-primary': '#333333',
	            'text-secondary': '#666666',
	            'text-white': '#ffffff',
	            'text-error': '#ff0000',
	            'border-color': '#cccccc',
	            'border-primary': '#6200ea',
	            'shadow-light': 'rgba(0, 0, 0, 0.1)',
	            'shadow-medium': 'rgba(0, 0, 0, 0.2)',
	            'shadow-focus': 'rgba(172, 113, 255, 0.75)',
	            'success-color': '#4CAF50',
	            'info-color': '#03A9F4',
	            'danger-color': '#dc3545',
	            'danger-dark': '#c82333',
	            'offline-bg': '#000040'
	        }
	    };

	    themeManager.def = {...themeManager.defaultTheme, ...themes[themeName]};
	    themeManager.updateTheme(themes[themeName]);
	    initializeColorPickers();
	}

	function toggleDropdown(element) {
	    let parent = element.closest('.dropdown');
	    parent.classList.toggle('active');
	}
	
	function calcTextStats() {
	    const text = editor.textContent;
	    const charCount = text.length;
	    const charCountNoSpaces = text.replace(/\s/g, "").length;
	    const wordCount = text.trim().split(/\s+/).filter(word => word).length;
	    const lineCount = text.split(/\n/).length;
	    const spaceCount = (text.match(/\s/g) || []).length;

		get('charCountNoSpaces').textContent = charCountNoSpaces;
		get('charCountSpaces').textContent = charCount;
		get('wordCount').textContent = wordCount;
		get('lineCount').textContent = lineCount;
		get('spaceCount').textContent = spaceCount;
	}

		/* Text Editing */
	    function changeFont(font) {
	      document.execCommand('fontName', false, font);
	      lastFont = font;
	    }
	    
	    let sha;

		function changeFontSize(increase) {
			const selection = window.getSelection();
			if (!selection.rangeCount) return;

			const range = selection.getRangeAt(0);
			let parentNode = range.commonAncestorContainer;

			if (parentNode.nodeType === Node.TEXT_NODE) {
				parentNode = parentNode.parentElement;
			}

			if (!editor.contains(parentNode)) return;

			const computedStyle = window.getComputedStyle(parentNode);
			let currentFontSize = parseInt(computedStyle.fontSize, 10) || 16;
			let newFontSize = Math.min(Math.max(increase ? currentFontSize + 1 : currentFontSize - 1, 7), 140);

			parentNode.style.fontSize = `${newFontSize}px`;
		}

		function changeAlignment(alignment) {
			execCmd('justify' + alignment);
			get('alignSelect').value = "";
		}
		
	/* Syntax Highlighting */
	const keywords = {
	  'function': 'keyword-function',
	  'const': 'keyword-const',
	  'let': 'keyword-let',
	  'var': 'keyword-var',
	  'return': 'keyword-return',
	  'if': 'keyword-if',
	  'else': 'keyword-else',
	  'for': 'keyword-for',
	  'while': 'keyword-while',
	  'do': 'keyword-do',
	  'switch': 'keyword-switch',
	  'case': 'keyword-case',
	  'default': 'keyword-default',
	  'break': 'keyword-break',
	  'continue': 'keyword-continue',
	  'try': 'keyword-try',
	  'catch': 'keyword-catch',
	  'finally': 'keyword-finally',
	  'throw': 'keyword-throw',
	  'class': 'keyword-class',
	  'extends': 'keyword-extends',
	  'super': 'keyword-super',
	  'import': 'keyword-import',
	  'export': 'keyword-export',
	  'new': 'keyword-new',
	  'this': 'keyword-this',
	  'delete': 'keyword-delete',
	  'typeof': 'keyword-typeof',
	  'void': 'keyword-void',
	  'in': 'keyword-in',
	  'instanceof': 'keyword-instanceof',
	  'await': 'keyword-await',
	  'async': 'keyword-async',
	  'yield': 'keyword-yield',
	  '()': 'text-bracket',
	  ',': 'text-comma',
	  '//': 'text-comment',
	  '/*': 'text-javascript-comment',
	  '{': 'curly-brace-open',
	  '}': 'curly-brace-closed'
	};

	function processInput(event) {
	    if (!["Tab", " ", "Enter"].includes(event.key)) return;
	    if (syntax_highlight === 'false') return;

	    const selection = window.getSelection();
	    if (selection.rangeCount === 0) return;

	    const range = selection.getRangeAt(0);
	    const cursorNode = range.startContainer;
	    if (cursorNode.nodeType !== Node.TEXT_NODE || !cursorNode.textContent) return;

	    const text = cursorNode.textContent;
	    const cursorPosition = range.startOffset;

	    let startPos = cursorPosition;
	    while (startPos > 0 && text[startPos - 1] !== ' ' && text[startPos - 1] !== '\n') {
	        startPos--;
	    }

	    const word = text.substring(startPos, cursorPosition).trim();
	    if (keywords[word]) {
	        createSpan(word, cursorNode, startPos, cursorPosition, event);
	    }
	}

	function createSpan(word, cursorNode, startPos, cursorPosition, event) {
	    const wordRange = document.createRange();
	    wordRange.setStart(cursorNode, startPos);
	    wordRange.setEnd(cursorNode, cursorPosition);

	    const span = document.createElement("span");
	    span.className = keywords[word];
	    span.textContent = word;

	    wordRange.deleteContents();
	    wordRange.insertNode(span);

	    const spaceText = document.createTextNode(event.key === " " ? " " : "\n");
	    span.after(spaceText);

	    const newRange = document.createRange();
	    newRange.setStartAfter(spaceText);
	    newRange.collapse(true);

	    const selection = window.getSelection();
	    selection.removeAllRanges();
	    selection.addRange(newRange);
	}
	function highlightCode() {
	  if (syntax_highlight === 'false') return;
	  
	  const selection = window.getSelection();
	  const range = selection.rangeCount ? selection.getRangeAt(0) : null;

	  const processNode = (node) => {
	    if (node.nodeType === Node.TEXT_NODE) {
	      const rawText = node.textContent;
	      const chunks = rawText.split(/( |\n)/);
	      const fragment = document.createDocumentFragment();

	      chunks.forEach(chunk => {
	        if (chunk === ' ') {
	          fragment.appendChild(document.createTextNode(' '));
	        } else if (chunk === '\n') {
	          fragment.appendChild(document.createTextNode('\n'));
	        } else if (keywords[chunk]) {
	          const span = document.createElement('span');
	          span.className = keywords[chunk];
	          span.textContent = chunk;
	          fragment.appendChild(span);
	        } else {
	          fragment.appendChild(document.createTextNode(chunk));
	        }
	      });

	      node.replaceWith(fragment);
	    } else if (node.nodeType === Node.ELEMENT_NODE) {
	      Array.from(node.childNodes).forEach(processNode);
	    }
	  };

	  if (range) {
	    const cursorNode = range.startContainer;
	    const cursorOffset = range.startOffset;

	    Array.from(editor.childNodes).forEach(processNode);

	    try {
	      const newRange = document.createRange();
	      newRange.setStart(cursorNode, cursorOffset);
	      newRange.collapse(true);
	      selection.removeAllRanges();
	      selection.addRange(newRange);
	    } catch (e) {
	      console.error("Failed to restore cursor position:", e);
	    }
	  }
	}

	editor.addEventListener('keydown', processInput);
	/* Paste listener done separately */
	
	/* Link Handling */	
	function processLinks() {
	  const selection = window.getSelection();
	  const range = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;

	  const textNodes = getTextNodes(editor);

	  textNodes.forEach(node => {
	    if (node.parentNode.nodeName === 'A') {
	    	node.parentNode.title = node.parentNode.href;
	    	return;
	    }

	    const text = node.textContent;
	    const urlRegex = /\bhttps?:\/\/[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}(:[0-9]{1,5})?(\/\S*)?/gi;

	    if (urlRegex.test(text)) {
	      const fragments = createLinkFragments(text);
	      node.parentNode.replaceChild(fragments, node);
	    }
	  });
	}

	function createLinkFragments(text) {
	  const urlRegex = /\bhttps?:\/\/[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}(:[0-9]{1,5})?(\/\S*)?/gi;
	  const fragment = document.createDocumentFragment();
	  let lastIndex = 0;

	  text.replace(urlRegex, (match, index) => {
	    if (index > lastIndex) {
	      fragment.appendChild(document.createTextNode(text.slice(lastIndex, index)));
	    }

	    const link = document.createElement('a');
	    link.href = match;
	    link.textContent = match;
	    link.target = '_blank';
	    fragment.appendChild(link);

	    lastIndex = index + match.length;
	  });

	  if (lastIndex < text.length) {
	    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
	  }

	  return fragment;
	}
	
	function hyperlink_click(event) {
		if (event.target.nodeName !== 'A') return;
		
		if (event.ctrlKey) {
			openHyperlinkMenu(event.target);
		}
	}
	
	function openHyperlinkMenu(hyperlink) {
		show_h_m();
	}
	
	function show_h_m() {
		get('hText').textContent = '';
		get('hLink').textContent = '';
		toggle('.hyperlink', 'block');
	}

	function getTextNodes(node) {
	  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
	    acceptNode: node => node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
	  });

	  const textNodes = [];
	  while (walker.nextNode()) {
	    textNodes.push(walker.currentNode);
	  }

	  return textNodes;
	}
	
	let strokes = [];
	let currentStroke = [];
	
	function resizeCanvas() {
	    const canvas = get('drawingCanvas');
	    const width = canvas.clientWidth;
	    const height = canvas.clientHeight;
	    
	    if (canvas.width !== width || canvas.height !== height) {
	        canvas.width = width;
	        canvas.height = height;
	    }
	}

	window.addEventListener('load', function() {
	    resizeCanvas();
	});

	window.addEventListener('resize', resizeCanvas);

	function toggleDrawingToolbar() {
	    const drawingToolbar = get('drawingToolbar');
	    const drawingCanvas = get('drawingCanvas');
	    const textToolbar = get('textToolbar');

	    drawingToolbar.classList.toggle('hide');
	    textToolbar.classList.toggle('hide', !drawingToolbar.classList.contains('hide'));

	    if (!drawingToolbar.classList.contains('hide')) {
	    	hideMenu();
	        drawingCanvas.style.display = 'block';
	        drawingCanvas.style.zIndex = '6';
	        context = drawingCanvas.getContext('2d');

	        if (savedDrawingData) {
	            const savedImage = new Image();
	            savedImage.src = savedDrawingData;
	            savedImage.onload = () => context.drawImage(savedImage, 0, 0);
	        }
	    } else {
	        drawingCanvas.style.display = 'none';
	    }
	}
	
	let line_width = 3;

	function saveAndHideDrawingToolbar() {
	    const drawingCanvas = get('drawingCanvas');
	    const drawingToolbar = get('drawingToolbar');
	    const textToolbar = get('textToolbar');

	    if (drawingCanvas) {
	        savedDrawingData = drawingCanvas.toDataURL();
	    }

	    /* Keep canvas behind text */
	    drawingCanvas.style.zIndex = '0';
	    textToolbar.classList.remove('hide');
	    drawingToolbar.classList.add('hide');
	}

	const canvas = get('drawingCanvas');
	const ctx = canvas.getContext('2d');
	let lastX = 0, lastY = 0;

	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';

	function setInkThickness(thickness) {
	    line_width = thickness;
	}
	
	get('penColor').addEventListener('input', (event) => {
	    const select = event.target.value;
	    ctx.strokeStyle = select;
	  });

	function selectPenColor() {
	    line_width = 3;
	    ctx.globalCompositeOperation = 'source-over';
	    ctx.strokeStyle = get('penColor').value;
	}

	function selectHighlighter() {
	    line_width = 20;
	    ctx.globalCompositeOperation = 'source-over';
	    ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
	}

	function selectEraser() {
	    ctx.globalCompositeOperation = 'destination-out';
	    line_width = 30;
	}

	function getPosition(event) {
	    let x, y;
	    if (event.touches) {
	        x = event.touches[0].clientX - canvas.offsetLeft;
	        y = event.touches[0].clientY - canvas.offsetTop;
	    } else {
	        x = event.offsetX;
	        y = event.offsetY;
	    }
	    return { x, y };
	}

	canvas.addEventListener('mousedown', (e) => {
	    const pos = getPosition(e);
	    isDrawing = true;
	    [lastX, lastY] = [pos.x, pos.y];
	    ctx.beginPath();
	    ctx.arc(pos.x, pos.y, ctx.lineWidth = line_width / 2, 0, Math.PI * 2);
	    ctx.fillStyle = ctx.strokeStyle;
	    ctx.fill();
	});

	canvas.addEventListener('touchstart', (e) => {
	    e.preventDefault();
	    const pos = getPosition(e);
	    isDrawing = true;
	    [lastX, lastY] = [pos.x, pos.y];
	    ctx.beginPath();
	    ctx.arc(pos.x, pos.y, ctx.lineWidth = line_width / 2, 0, Math.PI * 2);
	    ctx.fillStyle = ctx.strokeStyle;
	    ctx.fill();
	});

	canvas.addEventListener('mousemove', (e) => {
	    if (!isDrawing) return;
	    const pos = getPosition(e);
	    ctx.beginPath();
	    ctx.lineWidth = line_width;
	    ctx.moveTo(lastX, lastY);
	    ctx.lineTo(pos.x, pos.y);
	    ctx.stroke();
	    [lastX, lastY] = [pos.x, pos.y];
	});

	canvas.addEventListener('touchmove', (e) => {
	    e.preventDefault();
	    if (!isDrawing) return;
	    const pos = getPosition(e);
	    ctx.beginPath();
	    ctx.lineWidth = line_width;
	    ctx.moveTo(lastX, lastY);
	    ctx.lineTo(pos.x, pos.y);
	    ctx.stroke();
	    [lastX, lastY] = [pos.x, pos.y];
	});

	canvas.addEventListener('mouseup', () => (isDrawing = false));
	canvas.addEventListener('mouseout', () => (isDrawing = false));
	canvas.addEventListener('touchend', () => (isDrawing = false));
	canvas.addEventListener('touchcancel', () => (isDrawing = false));

	let selectedCell = null;
	let isResizing = false;
	let currentResizer = null;
	let initialWidth, initialHeight, initialX, initialY;

	function t_resize() {
	  const tables = document.querySelectorAll('table[role="grid"]');
	  if (!tables) return;
	  
	  tables.forEach(table => {
	    const cells = table.querySelectorAll('td, th');
	    cells.forEach(cell => {
	      ['right', 'bottom', 'corner'].forEach(type => {
	        const resizer = document.createElement('div');
	        resizer.className = `resizer ${type}-resizer`;
	        cell.appendChild(resizer);
	        resizer.addEventListener('mousedown', init_Resize);
	      });

	      if (window.getComputedStyle(cell).position !== 'relative') cell.style.position = 'relative';
	    });
	  });
	}

	function init_Resize(event) {
	  event.preventDefault();
	  isResizing = true;
	  currentResizer = event.target;
	  selectedCell = currentResizer.parentElement;

	  const { offsetWidth, offsetHeight } = selectedCell;
	  initialWidth = offsetWidth;
	  initialHeight = offsetHeight;
	  initialX = event.clientX;
	  initialY = event.clientY;

	  document.addEventListener('mousemove', handleResize);
	  document.addEventListener('mouseup', stop_Resize);

	  const table = selectedCell.closest('table');
	  if (table) {
	    table.style.userSelect = 'none';
	  }
	}

	function handleResize(event) {
	  if (!isResizing || !currentResizer) return;

	  const deltaX = event.clientX - initialX;
	  const deltaY = event.clientY - initialY;

	  if (currentResizer.classList.contains('right-resizer')) {
	    const new_wth = initialWidth + deltaX;
	    if (new_wth > 1) selectedCell.style.width = `${new_wth}px`;
	  } else if (currentResizer.classList.contains('bottom-resizer')) {
	    const new_hgt = initialHeight + deltaY;
	    if (new_hgt > 19) selectedCell.style.height = `${new_hgt}px`;
	  } else if (currentResizer.classList.contains('corner-resizer')) {
	    const new_Width = initialWidth + deltaX;
	    const new_Height = initialHeight + deltaY;
	    if (new_Width > 1) selectedCell.style.width = `${new_Width}px`;
	    if (new_Height > 19) selectedCell.style.height = `${new_Height}px`;
	  }
	}

	function stop_Resize() {
	  if (isResizing) {
	    isResizing = false;
	    document.removeEventListener('mousemove', handleResize);
	    document.removeEventListener('mouseup', stop_Resize);

	    const table = selectedCell.closest('table');
	    if (table) {
	      table.style.userSelect = '';
	    }
	    currentResizer = null;
	  }
	}

	async function insertTable() {
	  try {
	    const rows = await prompts("Enter the number of rows", "2");
	    const cols = await prompts("Enter the number of columns", "3");
	    
	    if (isNaN(rows) || isNaN(cols) || rows < 1 || cols < 1) {
	      throw new Error("Invalid table dimensions");
	    }
	    
	    const tableHtml = await cr_thtml(rows, cols);

		get('editor').focus();
	    document.execCommand('insertHTML', false, tableHtml);
	    setTimeout(t_resize, 100);
	  } catch (error) {
	    alert(`Failed to create table: ${error.message}`);
	  }
	}

	async function cr_thtml(rows, cols) {
	  const CHUNK_SIZE = 350;
	  let tableHtml = '<table role="grid">';
	  
	  for (let startRow = 0; startRow < rows; startRow += CHUNK_SIZE) {
	    const endRow = Math.min(startRow + CHUNK_SIZE, rows);
	    tableHtml += await createChunk(startRow, endRow, cols);
	  }
	  
	  tableHtml += '</table>';
	  return tableHtml;
	}

	async function createChunk(startRow, endRow, cols) {
	  let chunkHtml = '';
	  for (let i = startRow; i < endRow; i++) {
	    chunkHtml += '<tr>';
	    for (let j = 0; j < cols; j++) {
	      chunkHtml += '<td role="gridcell"><br></td>';
	    }
	    chunkHtml += '</tr>';
	  }
	  return chunkHtml;
	}

	get('editor').addEventListener('click', function(event) {
	  if (event.target.tagName === 'TD' || event.target.tagName === 'TH') {
		    selectedCell = event.target;
		    if (selectedCell.textContent.trim() !== '') {
		        showToolbar('textToolbar');
		    } else {
		        showToolbar('tableToolbar');
		    }
		}
	});

	function table_add(action) {
	    if (selectedCell) {
	        const table = selectedCell.parentElement.parentElement;
	        const selectedRowIndex = selectedCell.parentElement.rowIndex;
	        const selectedColumnIndex = selectedCell.cellIndex;

	        if (action === 'row') {
	            const newRow = table.rows[selectedRowIndex].cloneNode(true);
	            Array.from(newRow.cells).forEach(cell => cell.innerHTML = '<br>');
	            table.appendChild(newRow);
	        } else if (action === 'column') {
	            Array.from(table.rows).forEach(row => {
	                const newCell = row.cells[selectedColumnIndex].cloneNode(true);
	                newCell.innerHTML = '<br>';
	                row.insertBefore(newCell, row.cells[selectedColumnIndex + 1]);
	            });
	        }
	    }
	}

	function deleteRow() {
	  if (selectedCell) {
	    selectedCell.parentElement.remove();
	  }
	}

	function deleteColumn() {
	  if (selectedCell) {
	    const rows = selectedCell.parentElement.parentElement.rows;
	    for (let i = 0; i < rows.length; i++) {
	      rows[i].deleteCell(selectedCell.cellIndex);
	    }
	  }
	}

	async function mergeCells() {
	  if (selectedCell) {
	    const span = parseInt(await prompts("Enter merge value:", "2"));
	    if (span) {
	      selectedCell.colSpan = span;
	    }
	  }
	}

	function splitCell() {
	  if (selectedCell && selectedCell.colSpan > 1) {
	    selectedCell.colSpan = 1;
	  }
	}

	function setCellType(type) {
	  if (selectedCell) {
	    const cellType = document.createElement(type);
	    cellType.innerHTML = selectedCell.innerHTML;
	    selectedCell.parentElement.replaceChild(cellType, selectedCell);
	    selectedCell = cellType;
	  }
	}

	function setAlignment(alignment) {
	  if (selectedCell) {
	    selectedCell.style.textAlign = alignment;
	  }
	}

	function showToolbar(toolbarId) {
	  const toolbars = document.querySelectorAll('.toolbar');
	  toolbars.forEach(toolbar => {
	    if (toolbar.id === toolbarId) {
	      toolbar.classList.remove('hide');
	    } else {
	      toolbar.classList.add('hide');
	    }
	  });
	}

	function toggleTextToolbar() {
	  showToolbar('textToolbar');

	  const editor = get('editor');
	  const br = document.createElement('br');
	  editor.appendChild(br);
	}

    function getMousePos(event) {
      const rect = drawingCanvas.getBoundingClientRect();
      const clientX = event.clientX || event.touches[0].clientX;
      const clientY = event.clientY || event.touches[0].clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }

	let activeWrapper = null;

	const imageWrappers = new Set();

	const transformStates = new Map();

	editor.addEventListener('click', (event) => {
	    const target = event.target;

	    if (target.tagName === 'A') {
	        event.preventDefault();
	        hyperlink_click(event);
	        if (target.href && !event.ctrlKey) {
	            window.open(target.href, '_blank');
	        }
	        return;
	    }

	    if (!target.closest('.resizable') && !target.classList.contains('resize-handle') && !target.classList.contains('rotateIcon') && target.tagName !== 'IMG') {
	        deselectAllImages();
	        showToolbar('textToolbar');
	        return;
	    }

	    if (target.tagName === 'IMG') {
	        deselectAllImages();
	        
	        selectedImage = target;
	        const wrapper = target.closest('.resizable') || wrapImage(selectedImage);
	        activeWrapper = wrapper;
	        
	        wrapper.classList.add('resizing');
	        addResizeHandles(wrapper);
	        
	        if (!transformStates.has(wrapper)) {
	            transformStates.set(wrapper, {
	                translateX: 0,
	                translateY: 0,
	                rotateAngle: 0
	            });
	        }
	        
	        showToolbar('imageToolbar');
	    }
	});

	/* Image dragging */
	let x_offset = 0;
	let y_offset = 0;
	let isRotating = false;
	let isDragging = false;

	let resizeState = {
	    startX: 0,
	    startY: 0,
	    startWidth: 0,
	    startHeight: 0,
	    currentHandle: null
	};

	document.addEventListener("mousedown", (event) => {
	    const target = event.target;
	    
	    const wrapper = target.closest('.resizable');
	    if (!wrapper) {
	        if (!target.tagName === 'BUTTON') {
	            deselectAllImages();
	        }
	        return;
	    }
	    
	    if (wrapper) {
	        deselectAllImages();
	        
	        activeWrapper = wrapper;
	        wrapper.classList.add('resizing');
	        selectedImage = wrapper.querySelector('img');
	        
	        if (!wrapper.querySelector('.resize-handle')) {
	            addResizeHandles(wrapper);
	        }
	        
	        if (!transformStates.has(wrapper)) {
	            transformStates.set(wrapper, {
	                translateX: 0,
	                translateY: 0,
	                rotateAngle: 0
	            });
	        }
	        
	        showToolbar('imageToolbar');
	    }

	    if (target.classList.contains("resize-handle")) {
	        resizeState.currentHandle = target.classList[1];
	        initResize(event);
	        return;
	    }

	    if (target.classList.contains("rotateIcon")) {
	        isRotating = true;
	        selectedImage = wrapper.querySelector("img");
	        return;
	    }

	    if ((target.tagName === "IMG" || target === wrapper) && wrapper.classList.contains("resizing")) {
		    isDragging = true;
		    selectedImage = wrapper.querySelector("img");
		    selectedImage.draggable = false;
		    
		    const currentTransform = transformStates.get(wrapper);
		    
		    const rect = wrapper.getBoundingClientRect();
		    x_offset = event.clientX - rect.left;
		    y_offset = event.clientY - rect.top;
		    
		    wrapperInitialX = rect.left;
		    wrapperInitialY = rect.top;
		}
	}, { passive: true });

	document.addEventListener("mousemove", (event) => {
	    if (!activeWrapper || !selectedImage) return;
	    
	    const transformState = transformStates.get(activeWrapper);
	    if (!transformState) return;
	    
	    if (isRotating) {
	        const rect = activeWrapper.getBoundingClientRect();
	        const centerX = rect.left + rect.width / 2;
	        const centerY = rect.top + rect.height / 2;

	        const calculatedAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX) * (180 / Math.PI);
	        const rotationAngle = ((calculatedAngle - 92) + 360) % 360;

	        transformState.rotateAngle = rotationAngle;
	        updateRotationDisplay(activeWrapper, Math.round(transformState.rotateAngle) + '°');
	    }

	    if (isDragging && activeWrapper) {
		    const transformState = transformStates.get(activeWrapper);
		    if (!transformState) return;
		    
		    const deltaX = event.clientX - wrapperInitialX - x_offset;
		    const deltaY = event.clientY - wrapperInitialY - y_offset;
		    
		    transformState.translateX += deltaX;
		    transformState.translateY += deltaY;

		    wrapperInitialX = event.clientX - x_offset;
		    wrapperInitialY = event.clientY - y_offset;
		}

    	activeWrapper.style.transform = `translate(${transformState.translateX}px, ${transformState.translateY}px) rotate(${transformState.rotateAngle}deg)`;

	    if (resizeState.currentHandle && selectedImage) {
	        doResize(event);
	    }
	}, { passive: true });

	document.addEventListener("mouseup", () => {
	    isDragging = false;
	    isRotating = false;

	    if (resizeState.currentHandle) {
	        resizeState.currentHandle = null;
	    }
	}, { passive: true });
	
	function normalizeImageWrapper(wrapper) {
	    if (!transformStates.has(wrapper)) {
	        wrapper.style.transform = 'translate(0px, 0px) rotate(0deg)';
	        transformStates.set(wrapper, {
	            translateX: 0,
	            translateY: 0,
	            rotateAngle: 0
	        });
	    }
	    
	    return wrapper;
	}

	function deselectAllImages() {
	    const wrappers = document.querySelectorAll('.resizing');
	    wrappers.forEach(wrapper => {
	        wrapper.classList.remove('resizing');
	        const handles = wrapper.querySelectorAll('.resize-handle');
	        handles.forEach(handle => handle.remove());
	        const rotateIcon = wrapper.querySelectorAll('.rotateIcon');
	        rotateIcon.forEach(icon => icon.remove());
	        const angleDisp = wrapper.querySelectorAll('.rotate-display');
	        angleDisp.forEach(disp => disp.remove());
	    });
	    
	    selectedImage = null;
	    activeWrapper = null;
	}

	function removeResizeHandles(wrapper) {
	    if (!wrapper) return;
	    
	    wrapper.classList.remove('resizing');
	    const handles = wrapper.querySelectorAll('.resize-handle');
	    handles.forEach(handle => handle.remove());
	    const rotateIcon = wrapper.querySelectorAll('.rotateIcon');
	    rotateIcon.forEach(icon => icon.remove());
	    const angleDisp = wrapper.querySelectorAll('.rotate-display');
	    angleDisp.forEach(disp => disp.remove());
	}

	function wrapImage(image) {
	    if (image.parentElement.classList.contains('resizable')) {
	        image.parentElement.classList.add('resizing');
	        activeWrapper = normalizeImageWrapper(image.parentElement);
	        addResizeHandles(activeWrapper);
	        return activeWrapper;
	    }
	    
	    const wrapper = document.createElement('div');
	    wrapper.classList.add('resizable', 'resizing');
	    image.parentNode.insertBefore(wrapper, image);
	    wrapper.appendChild(image);
	    
	    activeWrapper = normalizeImageWrapper(wrapper);
	    
	    imageWrappers.add(activeWrapper);
	    addResizeHandles(activeWrapper);
	    return activeWrapper;
	}

	function addResizeHandles(wrapper) {
	    const existingHandles = wrapper.querySelectorAll('.resize-handle, .rotateIcon, .rotate-display');
	    existingHandles.forEach(handle => handle.remove());
	    
	    const handles = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
	    
	    handles.forEach(handle => {
	        const handleDiv = document.createElement('div');
	        handleDiv.classList.add('resize-handle', handle);
	        wrapper.appendChild(handleDiv);
	    });
	    
	    const rotateIcon = document.createElement('div');
	    rotateIcon.className = "rotateIcon";
	    rotateIcon.title = "Drag to rotate image";
	    wrapper.appendChild(rotateIcon);
	    
	    const rotateDisplay = document.createElement('div');
	    rotateDisplay.className = "rotate-display";
	    wrapper.appendChild(rotateDisplay);
	}

	function initResize(event) {
	    if (!selectedImage) return;
	    
	    const computedStyle = getComputedStyle(selectedImage);
	    resizeState = {
	        startX: event.clientX,
	        startY: event.clientY,
	        startWidth: parseInt(computedStyle.width, 10) || 0,
	        startHeight: parseInt(computedStyle.height, 10) || 0,
	        startLeft: parseInt(computedStyle.left, 10) || 0,
	        startTop: parseInt(computedStyle.top, 10) || 0,
	        currentHandle: resizeState.currentHandle
	    };
	}

	function doResize(event) {
	    if (!selectedImage || !activeWrapper) return;
	    
	    const deltaX = event.clientX - resizeState.startX;
	    const deltaY = event.clientY - resizeState.startY;

	    switch (resizeState.currentHandle) {
	        case 'top-left':
	            activeWrapper.style.width = `${resizeState.startWidth - deltaX}px`;
	            activeWrapper.style.height = `${resizeState.startHeight - deltaY}px`;
	            activeWrapper.style.left = `${resizeState.startLeft + deltaX}px`;
	            activeWrapper.style.top = `${resizeState.startTop + deltaY}px`;

	            selectedImage.style.width = `${resizeState.startWidth - deltaX}px`;
	            selectedImage.style.height = `${resizeState.startHeight - deltaY}px`;
	            break;

	        case 'top-right':
	            activeWrapper.style.width = `${resizeState.startWidth + deltaX}px`;
	            activeWrapper.style.height = `${resizeState.startHeight - deltaY}px`;
	            activeWrapper.style.top = `${resizeState.startTop + deltaY}px`;

	            selectedImage.style.width = `${resizeState.startWidth + deltaX}px`;
	            selectedImage.style.height = `${resizeState.startHeight - deltaY}px`;
	            break;

	        case 'bottom-left':
	            activeWrapper.style.width = `${resizeState.startWidth - deltaX}px`;
	            activeWrapper.style.height = `${resizeState.startHeight + deltaY}px`;
	            activeWrapper.style.left = `${resizeState.startLeft + deltaX}px`;

	            selectedImage.style.width = `${resizeState.startWidth - deltaX}px`;
	            selectedImage.style.height = `${resizeState.startHeight + deltaY}px`;
	            break;

	        case 'bottom-right':
	            activeWrapper.style.width = `${resizeState.startWidth + deltaX}px`;
	            activeWrapper.style.height = `${resizeState.startHeight + deltaY}px`;

	            selectedImage.style.width = `${resizeState.startWidth + deltaX}px`;
	            selectedImage.style.height = `${resizeState.startHeight + deltaY}px`;
	            break;
	    }
	}

	function layerUp() {
	    if (!activeWrapper) return;

	    const currentZ = parseInt(activeWrapper.style.zIndex, 10) || 0;
	    activeWrapper.style.zIndex = currentZ + 1;
	    updateRotationDisplay(activeWrapper, "Layer " + (Number(activeWrapper.style.zIndex) + 1));
	}

	function layerDown() {
	    if (!activeWrapper) return;

	    const currentZ = parseInt(activeWrapper.style.zIndex, 10) || 0;
	    if (currentZ > 0) {
	        activeWrapper.style.zIndex = currentZ - 1;
	    }
	    updateRotationDisplay(activeWrapper, "Layer " + (Number(activeWrapper.style.zIndex) + 1));
	}

	let hide_timeout;

	function updateRotationDisplay(wrapper, text) {
	    const display = wrapper.querySelector('.rotate-display');

	    if (display) {
	        display.style.display = 'block';
	        display.textContent = text;

	        clearTimeout(hide_timeout);

	        hide_timeout = setTimeout(() => {
	            display.style.display = 'none';
	        }, 1000);
	    }
	}
	
	document.addEventListener('paste', async (event) => {
		setTimeout(() => highlightCode(), 5);
		
	    const items = event.clipboardData.items;
	    for (let item of items) {
	        if (item.type.startsWith('image/')) {
	            event.preventDefault();
	            const file = item.getAsFile();
	            const base64Data = await convertImageToBase64(URL.createObjectURL(file));

	            const selection = window.getSelection();
	            if (selection.rangeCount > 0) {
	                const range = selection.getRangeAt(0);
	                const imgElement = document.createElement('img');
	                imgElement.src = base64Data;
	                range.insertNode(imgElement);

	                range.setStartAfter(imgElement);
	                range.setEndAfter(imgElement);
	                selection.removeAllRanges();
	                selection.addRange(range);
	            }
	        }
	    }
	});

	document.addEventListener('drop', async (event) => {
	    event.preventDefault();
	    const files = event.dataTransfer.files;
	    for (let file of files) {
	        if (file.type.startsWith('image/')) {
	            const base64Data = await convertImageToBase64(URL.createObjectURL(file));
	            
	            const selection = window.getSelection();
	            if (selection.rangeCount > 0) {
	                const range = selection.getRangeAt(0);
	                const imgElement = document.createElement('img');
	                imgElement.src = base64Data;
	                range.insertNode(imgElement);
	            }
	        }
	    }
	});

	async function convertImageToBase64(url, maxWidth = 1280, maxHeight = 720, quality = 1) {
	    return new Promise((resolve, reject) => {
	        const img = new Image();
	        img.crossOrigin = "anonymous";
	        
	        img.onload = () => {
	            let { width, height } = img;
	            if (width > maxWidth || height > maxHeight) {
	                const aspectRatio = width / height;
	                if (width > height) {
	                    width = maxWidth;
	                    height = width / aspectRatio;
	                } else {
	                    height = maxHeight;
	                    width = height * aspectRatio;
	                }
	            }
	            
	            const canvas = document.createElement('canvas');
	            canvas.width = width;
	            canvas.height = height;
	            const ctx = canvas.getContext('2d');
	            ctx.drawImage(img, 0, 0, width, height);
	            
	            const base64Data = canvas.toDataURL('image/jpeg', quality);
	            resolve(base64Data);
	        };
	        
	        img.onerror = reject;
	        img.src = url;
	    });
	}


	const FILE_MARKERS = {
	    UNENCRYPTED_V2: "EBF_UNENCRYPTED_V2",
	    UNENCRYPTED_V3: "EBF_UNENCRYPTED_V3",
	    ENCRYPTED_V2: "EBF_ENCRYPTED_V2"
	};

	/* GitHub integration */
	function encodeToBase64(content, chunkSize = 1024) {
	  const data = typeof content === 'string' 
	    ? new Uint8Array(new TextEncoder().encode(content))
	    : content;
	    
	  let result = '';

	  for (let i = 0; i < data.length; i += chunkSize) {
	    const chunk = data.slice(i, i + chunkSize);
	    result += String.fromCharCode(...chunk);
	  }

	  return btoa(result);
	}

	async function saveToGithub(content, fileName) {
	    try {
	        const response = await fetch(`${path}/${fileName}`, {
	            method: 'PUT',
	            headers: {
	                'Authorization': `Bearer ${gtoken}`,
	                'Accept': 'application/vnd.github.v3+json',
	                'Content-Type': 'application/json'
	            },
	            body: JSON.stringify({
	                message: sha ? `Updated ${fileName}` : `Created ${fileName}`,
	                content: encodeToBase64(content),
	                sha: sha
	            })
	        });

	        if (!response.ok) throw new Error('Failed to save to GitHub');
	        return true;
	    } catch (error) {
	        console.error('GitHub save failed:', error);
	        throw new Error('Failed to save to GitHub');
	    }
	}

	let selectedSaveOptions = {
	    encryption: null,
	    saveLocation: null
	};

	/* Modal management */
	function showSaveOptions() {
	    selectedSaveOptions = { encryption: null, saveLocation: null };
	    document.querySelectorAll('.save-option').forEach(opt => {
	        opt.classList.remove('selected');
	    });
	    
	    if (!isConnected) { get('gh').style.display = 'none'; }
	    else { get('gh').style.display = 'block'; }
	    
	    get('modalOverlay').style.display = 'block';
	    get('saveOptionsModal').style.display = 'block';
	    get('passwordModal').style.display = 'none';
	    get('openFileModal').style.display = 'none';
	    
	  	document.addEventListener("keydown", saveOpt_click);
	  
		function saveOpt_click() {
		  if (event.key === "Enter") {
		    init_save();
		    document.removeEventListener("keydown", saveOpt_click);
		  }
		}
	}

	function selectSaveOption(option) {
	    if (['encrypted', 'unencrypted'].includes(option)) {
	        selectedSaveOptions.encryption = option;
	        document.querySelectorAll('.save-options:first-of-type .save-option')
	            .forEach(opt => opt.classList.remove('selected'));
	        event.currentTarget.classList.add('selected');
	    } else {
	        event.currentTarget.classList.toggle('selected');
	        selectedSaveOptions.saveLocation += option;
	    }
	    
	}

	async function init_save() {
	    if (!selectedSaveOptions.encryption || !selectedSaveOptions.saveLocation) {
	        alert("Please select both encryption and save options");
	        return;
	    }

		if (!fileName) { 
			fileName = await prompts("Enter filename:", "Untitled Document"); 
			changeDocTitle(fileName);
		}
		
		if (selectedSaveOptions.saveLocation.includes('download')) {
            proceed_save();
        } else dispModal('save');
	}
	
	async function proceed_save() {
	    try {
	        if (!selectedSaveOptions || !selectedSaveOptions.saveLocation || !selectedSaveOptions.encryption) {
	            throw new Error("Invalid save options provided.");
	        }

	        if (selectedSaveOptions.encryption === 'encrypted') {
	            /* Encryption */
	            showPasswordModal("Set Password for Encryption", async (password) => {
	                try {
	                    if (!password || password.length < 3) {
	                        throw new Error("Password must be at least 3 characters long.");
	                    }
	                    await saveFile({
	                        fileName,
	                        password,
	                        saveLocation: selectedSaveOptions.saveLocation,
	                        editorElement: get('editor'),
	                        drawingData: savedDrawingData
	                    });
	                    hideModal();
	                } catch (error) {
	                    console.error("Error during encrypted save:", error);
	                    alert('Failed to save file: ' + error.message);
	                }
	            }, showSaveOptions);
	        } else {
	            /* No Encryption */
	            await saveFile({
	                fileName,
	                saveLocation: selectedSaveOptions.saveLocation,
	                editorElement: get('editor'),
	                drawingData: savedDrawingData
	            });
	            hideModal();
	        }
	    } catch (error) {
	        console.error("Error in proceed_save():", error);
	        alert("Err in proceed_save(): " + error.message);
	    }
	}
	
	let url = new URL(window.location.href);

	const shareSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 15 15" fill="none"  stroke="var(--text-primary)">
	  <path fill-rule="evenodd" clip-rule="evenodd" d="M3.5 5.00006C3.22386 5.00006 3 5.22392 3 5.50006L3 11.5001C3 11.7762 3.22386 12.0001 3.5 12.0001L11.5 12.0001C11.7761 12.0001 12 11.7762 12 11.5001L12 5.50006C12 5.22392 11.7761 5.00006 11.5 5.00006L10.25 5.00006C9.97386 5.00006 9.75 4.7762 9.75 4.50006C9.75 4.22392 9.97386 4.00006 10.25 4.00006L11.5 4.00006C12.3284 4.00006 13 4.67163 13 5.50006L13 11.5001C13 12.3285 12.3284 13.0001 11.5 13.0001L3.5 13.0001C2.67157 13.0001 2 12.3285 2 11.5001L2 5.50006C2 4.67163 2.67157 4.00006 3.5 4.00006L4.75 4.00006C5.02614 4.00006 5.25 4.22392 5.25 4.50006C5.25 4.7762 5.02614 5.00006 4.75 5.00006L3.5 5.00006ZM7 1.6364L5.5682 3.0682C5.39246 3.24393 5.10754 3.24393 4.9318 3.0682C4.75607 2.89246 4.75607 2.60754 4.9318 2.4318L7.1818 0.181802C7.26619 0.09741 7.38065 0.049999 7.5 0.049999C7.61935 0.049999 7.73381 0.09741 7.8182 0.181802L10.0682 2.4318C10.2439 2.60754 10.2439 2.89246 10.0682 3.0682C9.89246 3.24393 9.60754 3.24393 9.4318 3.0682L8 1.6364L8 8.5C8 8.77614 7.77614 9 7.5 9C7.22386 9 7 8.77614 7 8.5L7 1.6364Z" fill="#000000"/>
	</svg>`;
	
	const fileSVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="#000000" width="15px" height="15px" viewBox="0 0 30 30"  stroke="var(--text-primary)"> 
	  <path fill-rule="evenodd" clip-rule="evenodd" d="M1305,456h-18a2,2,0,0,1-2-2V431a2,2,0,0,1,2-2h12.94a1.039,1.039,0,0,1,.83.289l5.91,5.911a1.017,1.017,0,0,1,.29.8H1307v18A2,2,0,0,1,1305,456Zm-5-24.522V436h4.52Zm5,6.522h-6a1,1,0,0,1-1-1v-6h-11v23h18V438Zm-12,7h6a1,1,0,0,1,0,2h-6A1,1,0,0,1,1293,445Z" transform="translate(-1282 -427.5)"/> 
    </svg>`;
	
	const folderSVG = `<svg width="15px" height="15px" viewBox="0 0 26 26" stroke="var(--text-primary)" xmlns="http://www.w3.org/2000/svg">
	  <path fill-rule="evenodd" clip-rule="evenodd" d="M1 5C1 3.34315 2.34315 2 4 2H8.43845C9.81505 2 11.015 2.93689 11.3489 4.27239L11.7808 6H13.5H20C21.6569 6 23 7.34315 23 9V19C23 20.6569 21.6569 22 20 22H4C2.34315 22 1 20.6569 1 19V10V9V5ZM3 9V10V19C3 19.5523 3.44772 20 4 20H20C20.5523 20 21 19.5523 21 19V9C21 8.44772 20.5523 8 20 8H13.5H11.7808H4C3.44772 8 3 8.44772 3 9ZM9.71922 6H4C3.64936 6 3.31278 6.06015 3 6.17071V5C3 4.44772 3.44772 4 4 4H8.43845C8.89732 4 9.2973 4.3123 9.40859 4.75746L9.71922 6Z" />
	</svg>`;
	
	const shareDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(shareSVG);
	const fileDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(fileSVG);
	const folderDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(folderSVG);

	let dir = [];
	let addListener = true;
	async function show_FL() {
	  const filesList = document.getElementById('savedFilesList');
	  const confOpen = get('confopen');
	  const createFolder = get('create-folder');
	  
	  createFolder.style.display = "flex";

	  if (operation) {
	    setupSaveButton(confOpen);
	  } else {
	    setupOpenButton(confOpen);
	  }

	  if (!isConnected) {
	    displayMessage(filesList, "Ensure you are connected to see your files.", "no_file", "Make sure you are connected to Wi-Fi");
	    createFolder.style.display = "none";
	    return;
	  }

	  if (viewShare) {
	    displayMessage(filesList, "You are viewing a shared file", "no_file", "You cannot modify these files");
	    return;
	  }

	  try {
	    showSpinner();
	    const response = await fetch(path, {
	      method: 'GET',
	      headers: {
	        'Authorization': `Bearer ${gtoken}`,
	        'Accept': 'application/vnd.github.v3+json'
	      }
	    });

	    if (!response.ok) {
	      console.warn("GitHub didn't respond / no files uploaded");
	      displayMessage(filesList, "Please upload a file to see it here.", "no_file", "Upload a file or open a local one");
	      endSpinner();
	      return;
	    }

	    const githubFiles = await response.json();
	    filesList.innerHTML = '';
	    updateDirList();

	    githubFiles.forEach(file => {
	      if (file.name === '.gitignore') return;
	      createFileItem(filesList, file);
	    });

	    if (!filesList.innerHTML) {
	      displayMessage(filesList, "Please upload a file to see it here.", "no_file", "Save a file to this location");
	    }

	    endSpinner();
	  } catch (error) {
	    console.error('An error occurred:', error);
	    alert('An error occurred: ' + error.message);
	    endSpinner();
	  }
	}

	function setupSaveButton(confOpen) {
	  confOpen.onclick = proceed_save;
	  confOpen.textContent = "Save Here";
	  confOpen.title = "Save your file at this location";
	}

	function setupOpenButton(confOpen) {
	  confOpen.onclick = () => get('fileInput').click();
	  confOpen.textContent = "Open Local File";
	  confOpen.title = "Open a file saved on your device";
	}

	function displayMessage(container, message, className, title) {
	  container.innerHTML = `<p style="color: #575757;" class="${className}" title="${title}">${message}</p>`;
	}

	function createFileItem(filesList, file) {
	  const fileItem = document.createElement('div');
	  const ftitle = file.name.replace(/／/g, '/');
	  fileItem.className = 'saved-file-item';
	  fileItem.id = ftitle;

	  if (file.type === 'dir') {
	    fileItem.innerHTML = `<img title="Folder" class="file_icon" src="${folderDataUrl}"><span class="open_file_title">${file.name}</span><span class="delete-icon" style="margin-left: 34px" title="Delete folder">🗑️</span>`;
	    fileItem.title = `Navigate to '${ftitle}'`;
	    fileItem.onclick = (event) => handleFolderClick(event, file.path, file.name);
	  } else {
	    fileItem.innerHTML = `<img title="File" class="file_icon" src="${fileDataUrl}"><span class="open_file_title">${ftitle}</span><svg class="share" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 15" stroke-width="1" fill="var(--text-primary)"><path d="M3.5 5.00006C3.22386 5.00006 3 5.22392 3 5.50006L3 11.5001C3 11.7762 3.22386 12.0001 3.5 12.0001L11.5 12.0001C11.7761 12.0001 12 11.7762 12 11.5001L12 5.50006C12 5.22392 11.7761 5.00006 11.5 5.00006L10.25 5.00006C9.97386 5.00006 9.75 4.7762 9.75 4.50006C9.75 4.22392 9.97386 4.00006 10.25 4.00006L11.5 4.00006C12.3284 4.00006 13 4.67163 13 5.50006L13 11.5001C13 12.3285 12.3284 13.0001 11.5 13.0001L3.5 13.0001C2.67157 13.0001 2 12.3285 2 11.5001L2 5.50006C2 4.67163 2.67157 4.00006 3.5 4.00006L4.75 4.00006C5.02614 4.00006 5.25 4.22392 5.25 4.50006C5.25 4.7762 5.02614 5.00006 4.75 5.00006L3.5 5.00006ZM7 1.6364L5.5682 3.0682C5.39246 3.24393 5.10754 3.24393 4.9318 3.0682C4.75607 2.89246 4.75607 2.60754 4.9318 2.4318L7.1818 0.181802C7.26619 0.09741 7.38065 0.049999 7.5 0.049999C7.61935 0.049999 7.73381 0.09741 7.8182 0.181802L10.0682 2.4318C10.2439 2.60754 10.2439 2.89246 10.0682 3.0682C9.89246 3.24393 9.60754 3.24393 9.4318 3.0682L8 1.6364L8 8.5C8 8.77614 7.77614 9 7.5 9C7.22386 9 7 8.77614 7 8.5L7 1.6364Z"></svg><span class="delete-icon" title="Delete file">🗑️</span>`;
	    fileItem.title = `Open "${ftitle}"`;
	    fileItem.onclick = (event) => handleFileClick(event, file, ftitle);
	    
	    if (operation) {
	      fileItem.style.opacity = '0.4';
	      fileItem.onclick = null;
	      fileItem.title = '';
	    }
	  }

	  filesList.appendChild(fileItem);
	}

	function handleFolderClick(event, path, name) {
	  if (event.target.classList.contains('delete-icon')) {
	    deleteFolder(path);
	  } else if (event.target.classList.contains('share')) {
	    shareFile(name, path);
	  } else {
	    navigate_to(name);
	  }
	}

	function handleFileClick(event, file, ftitle) {
	  if (event.target.classList.contains('delete-icon')) {
	    deleteFile(file.path, file.id, ftitle);
	  } else if (event.target.classList.contains('share')) {
	    shareFile(file.name, file.path);
	  } else {
	    openFile({
	      file_path: file.name,
	      file_name: ftitle,
	      userId: userId,
	      editorElement: document.getElementById('editor'),
	      canvasElement: document.getElementById('drawingCanvas')
	    });
	  }
	}

	function updateDirList() {
	  const dirList = document.getElementById('dir_list');
	  dirList.innerHTML = `<span class="dir-item" onclick="navigate_to('', '')">${usname}</span>` + dir.map((folder, index) => ` > <span class="dir-item" onclick="navigate_to('${folder}', ${index})">${folder}</span>`).join('');
	}

	function navigate_to(folder, index = null) {
	  if (folder === '') {
	    path = `https://api.github.com/repos/eselagas/app.files/contents/docs/${userId}`;
	    dir = [];
	    show_FL();
	    return;
	  }
	  
	  if (index !== null) {
	    dir = dir.slice(0, index + 1);
	    path = `https://api.github.com/repos/eselagas/app.files/contents/docs/${userId}` + dir.map(d => `/${d}`).join('');
	  } else {
	    path += `/${folder}`;
	    dir.push(folder);
	  }
	  
	  show_FL();
	}
	
	async function dispModal(type) {
		if (type === 'save') {
			get('operation').textContent = "Save File";
			operation = 1;
			await show_FL();
		} else if (type === 'open') {
			get('operation').textContent = "Open File";
		    operation = '';
		    await show_FL();
		} else await show_FL();
		
		showModal('openFileModal');
	}

	async function deleteFile(filePath, id, name) {
	    try {
	    	showSpinner();
	        const getResponse = await fetch(`https://api.github.com/repos/eselagas/app.files/contents/${filePath}`, {
	            method: 'GET',
	            headers: {
	                'Authorization': `Bearer ${gtoken}`,
	                'Accept': 'application/vnd.github.v3+json'
	            }
	        });

	        if (!getResponse.ok) {
	            throw new Error('Failed to get the file sha');
	        }

	        const fileMetadata = await getResponse.json();
	        const delsha = fileMetadata.sha;

	        const deleteResponse = await fetch(`https://api.github.com/repos/eselagas/app.files/contents/${filePath}`, {
	            method: 'DELETE',
	            headers: {
	                'Authorization': `Bearer ${gtoken}`,
	                'Accept': 'application/vnd.github.v3+json',
	                'Content-Type': 'application/json'
	            },
	            body: JSON.stringify({
	                message: `Deleted file: ${filePath}`,
	                sha: delsha
	            })
	        });

	        if (!deleteResponse.ok) {
	            throw new Error('Failed to delete the file from GitHub');
	        }

	    } catch (error) {
	        console.error('An error occurred:', error);
	        alert('An error occurred: ' + error.message);
	    } finally {
	        endSpinner();
	        dispModal('open');
	    }
	}
	
	async function deleteFolder(folderPath) {
	    try {
	        showSpinner();
	        const getResponse = await fetch(`https://api.github.com/repos/eselagas/app.files/contents/${folderPath}`, {
	            method: 'GET',
	            headers: {
	                'Authorization': `Bearer ${gtoken}`,
	                'Accept': 'application/vnd.github.v3+json'
	            }
	        });

	        if (!getResponse.ok) {
	            throw new Error(`Failed to fetch contents of folder ${folderPath}`);
	        }

	        const folderContents = await getResponse.json();

	        const deletePromises = folderContents.map(async (item) => {
                await fetch(`https://api.github.com/repos/eselagas/app.files/contents/${item.path}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${gtoken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: `Deleted item: ${item.path}`,
                        sha: item.sha
                    })
                });
	        });

	        await Promise.all(deletePromises);

	    } catch (error) {
	        console.error('An error occurred:', error);
	        alert('An error occurred: ' + error.message);
	    } finally {
	        endSpinner();
	        dispModal();
	    }
	}
	
	async function crFolder() {
		const name = await prompts("Folder Name", "New Folder") + '/';
		if (!name) return;
		const saveLocation = 'folder';
		await saveFile({
            fileName: name,
            saveLocation,
            editorElement: get('editor'),
            drawingData: savedDrawingData
        });
        
		dispModal();
	}
	
	function shareFile(name, pth) {
		const baseurl = window.location.protocol + "//" + window.location.host + window.location.pathname;
		const viewType = '0';
		const newURL = `https://eselagas.github.io/:r?pth=${name}&loc=${pth}&id=${userId}&r_type=ebf_file`;
		const final = newURL.replace(/ /g, ' ');

		navigator.clipboard.writeText(final);
		alert("Link copied to clipboard");
	}

	function showModal(modalId) {
	    get('modalOverlay').style.display = 'block';
	    get(modalId).style.display = 'block';
	    get('passwordModal').style.display = 'none';
	    get('saveOptionsModal').style.display = 'none';
	}
	
	function convertToDate(isoTimestamp) {
        const date = new Date(isoTimestamp);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

	let currentModalCallback = null;

	function showPasswordModal(title, callback, escButton) {
	    get('modalOverlay').style.display = 'block';
	    get('passwordModal').style.display = 'block';
	    get('saveOptionsModal').style.display = 'none';
	    get('openFileModal').style.display = 'none';
	    get('passwordModalTitle').textContent = title;
	    const password = get('passwordInput');
	    
	    password.value = '';
	    password.focus();
	    password.addEventListener('keyup', (e) => {
	    	if (e.key === 'Enter') set_as_password();
	    });
	    
	    if (escButton) {
	    	get('_cancel_').addEventListener('click', escButton);
    	}
	    currentModalCallback = callback;
	}

	function hideModal() {
	    get('modalOverlay').style.display = 'none';
	    get('passwordModal').style.display = 'none';
	    get('openFileModal').style.display = 'none';
	    get('saveOptionsModal').style.display = 'none';
	    
	    selectedSaveOptions = { encryption: null, saveLocation: null };
	    document.querySelectorAll('.save-option').forEach(opt => {
	        opt.classList.remove('selected');
	    });

	    endSpinner();
	}

	async function set_as_password() {
	    const password = get('passwordInput').value;
	    if (password && currentModalCallback) {
	        await currentModalCallback(password);
	        currentModalCallback = null;
	    }
	}

	/* Save file */
	async function saveFile({
	    fileName,
	    password = null,
	    saveLocation,
	    editorElement,
	    drawingData = null
	}) {
	    try {
	        showSpinner();
	        const editorContent = editorElement.innerHTML;
	        const inkData = drawingData ? `<ink:${drawingData}>` : '';
	        const content = editorContent + inkData;
	        
	        let fileData;
	        
	        if (password) {
	            const encryptedData = await encryptContent(content, password);
	            fileData = {
	                marker: FILE_MARKERS.ENCRYPTED_V2,
	                name: fileName,
	                data: {
	                    encrypted: Array.from(encryptedData.encrypted),
	                    salt: Array.from(encryptedData.salt),
	                    iv: Array.from(encryptedData.iv)
	                },
	                date: new Date().toISOString(),
	                encrypted: true
	            };
	        } else {
	            const lightweightEncryptedData = lightweightEncrypt(content);
	            fileData = {
	                marker: FILE_MARKERS.UNENCRYPTED_V3,
	                name: fileName,
	                data: lightweightEncryptedData,
	                date: new Date().toISOString(),
	                encrypted: false
	            };
	        }

	        if (saveLocation.includes('github')) {
	            try {
	                await saveToGithub(JSON.stringify(fileData), fileName.replace(/\//g, '／'));
	                changeDocTitle(fileName);
	            } catch (error) {
	                throw new Error('Failed to save file to GitHub: ' + error.message);
	            }
	        }

	        if (saveLocation.includes('download')) {
	            const blob = new Blob([JSON.stringify(fileData)], { type: 'application/json' });
	            const url = URL.createObjectURL(blob);
	            const a = document.createElement('a');
	            a.href = url;
	            a.download = `${fileName.replace(/[\/\\?*:|"<>]/g, '_')}.ebf`;
	            a.click();
	            URL.revokeObjectURL(url);
	            changeDocTitle(fileName);
	        }
	        
	        if (saveLocation === 'folder') {
	        	try {
	                await saveToGithub('', fileName + '.gitignore');
	            } catch (error) {
	                throw new Error('Failed to save folder: ' + error.message);
	            }
	        }

	        endSpinner();
	        document.querySelector('#editor').dataset.modified = 'false';
	        return { success: true };
	    } catch (error) {
	        console.error('Save failed:', error);
	        throw new Error('Failed to save the file');
	    }
    }
    
	function lightweightEncrypt(data) {
	    const pseudoKey = 42;
	    const encodedData = new TextEncoder().encode(data);
	    const encryptedData = encodedData.map(byte => byte ^ pseudoKey);
	    return Array.from(encryptedData);
	}

	function lightweightDecrypt(encryptedData) {
		log("Decrypting: " + fileName);
	    const pseudoKey = 42;
	    const decodedData = encryptedData.map(byte => byte ^ pseudoKey);
	    return new TextDecoder().decode(new Uint8Array(decodedData));
	}

	function parseFileContent(cont) {
	    try {
	        let content = JSON.parse(cont);
	        if (content.marker === FILE_MARKERS.UNENCRYPTED_V3 || content.marker === "FILE_MARKERS.UNENCRYPTED_V3") {
			    content.data = lightweightDecrypt(content.data);
			}
	        return content;
	    } catch (e) {
	        log("Caught " + e);
	        const encryptedData = lightweightEncrypt(cont);
	        return { 
	            name: "Legacy File", 
	            data: encryptedData, 
	            marker: FILE_MARKERS.UNENCRYPTED_V3, 
	            password: null 
	        };
	    }
	}

	function modURL(key, value) {
	    url.searchParams.set(key, value);
	    window.history.pushState({}, '', url);
	}

	async function decodeFromBase64(base64String, chunkSize = 1024) {
	  const binaryString = atob(base64String);
	  const length = binaryString.length;
	  const data = new Uint8Array(length);

	  for (let i = 0; i < length; i += chunkSize) {
	    const end = Math.min(i + chunkSize, length);
	    for (let j = i; j < end; j++) {
	      data[j] = binaryString.charCodeAt(j);
	    }
	  }

	  return new TextDecoder().decode(data);
	}
	
	let pref = true;
	const checkbox = document.getElementById('prefCheckbox');
	checkbox.addEventListener('change', () => {
	    pref = checkbox.checked;
	});

	async function openFile({
	    file_path = null,
	    file_name = null,
	    password = null,
	    fileContent = null,
	    editorElement = get('editor'),
	    userId,
	    canvasElement = get('drawingCanvas')
	}) {
	    try {
	        showSpinner();
	        let fileData, content, fletype;
	        fileName = file_name;

	        if (fileName) {
	            const response = await fetch(`${path}/${file_path}`, {
	                method: 'GET',
	                headers: {
	                    'Authorization': `Bearer ${gtoken}`,
	                    'Accept': 'application/vnd.github.v3+json',
	                    'Content-Type': 'application/json',
	                }
	            });

	            if (!response.ok) {
	                throw new Error('Failed to fetch file from GitHub');
	            }

	            const githubData = await response.json();
	            fileContent = await decodeFromBase64(githubData.content);
	            fileData = parseFileContent(fileContent);
	            sha = githubData.sha;

	            if (fileData.marker === FILE_MARKERS.ENCRYPTED_V2) {
	                endSpinner();
	                return new Promise((resolve) => {
	                    showPasswordModal("Enter Password to Open File", async (enteredPassword) => {
	                        try {
	                            showSpinner();
	                            content = await decryptContent(fileData.data, enteredPassword);
	                            resolve(processFileContent(content, editorElement, canvasElement));
	                            endSpinner();
	                        } catch (error) {
	                            alert("Invalid password!");
	                            resolve({ success: false, error: "Invalid password" });
	                        }
	                        hideModal();
	                        changeDocTitle(fileName);
	                    }, () => dispModal('open'));
	                });
	            } else {
	                content = fileData.data;
	                changeDocTitle(fileName);
	                hideModal();
	            }
	            fletype = 1;
	            modURL('user-Pref', pref);
	        } else {
	            /* Handle local files */
	            fileData = parseFileContent(fileContent);

	            if (fileData.marker === FILE_MARKERS.ENCRYPTED_V2) {
	                endSpinner();
	                return new Promise((resolve) => {
	                    showPasswordModal("Enter Password to Open File", async (enteredPassword) => {
	                        try {
	                            showSpinner();
	                            content = await decryptContent(fileData.data, enteredPassword);
	                            resolve(processFileContent(content, editorElement, canvasElement));
	                            endSpinner();
	                        } catch (error) {
	                            alert("Invalid password, try again.");
	                            resolve({ success: false, error: "Invalid password" });
	                        }
	                        hideModal();
	                        changeDocTitle(fileData.name);
	                    }, () => dispModal('open'));
	                });
	            } else {
	                content = fileData.data;
	                fileName = fileData.name;
	                changeDocTitle(fileName);
	                hideModal();
	            }
	            fletype = 0;
	            modURL('user-Pref', false);
	        }

	        document.querySelector('#editor').dataset.modified = 'false';
	        modURL('lo_File', path.substring(62));
	        modURL('path_name', file_path);
	        modURL('type', fletype);
	        modURL('name', fileName);
	        return processFileContent(content, editorElement, canvasElement);
	    } catch (error) {
	        console.error('Open failed:', error);
	        endSpinner();
	        throw new Error(error.message || 'Failed to open the file');
	    }
	}

	function processFileContent(content, editorElement, canvasElement) {
	    content = typeof content === 'string' ? content : JSON.stringify(content);

	    /* Handle drawing data */
	    if (canvasElement) {
	        const inkDataMatch = content.match(/<ink:([^>]*)>/);
	        const context = canvasElement.getContext('2d');
	        if (inkDataMatch) {
	            const drawingData = inkDataMatch[1];
	            const savedImage = new Image();
	            savedImage.src = drawingData;
	            savedImage.onload = () => {
	                canvasElement.style.display = 'block';
	                canvasElement.style.zIndex = '0';
	                context.drawImage(savedImage, 0, 0);
	            };
	        } else {
	        	context.clearRect(0, 0, canvasElement.width, canvasElement.height);
	        	log("No canvas was found in file");
        	}
	    }

	    const cleanContent = content
	        .replace(/<ink:.*>/, '')
	        .replace(/<picture:[^>]*>/g, '');
	    editorElement.innerHTML = cleanContent;
	    /* Insert openFile functions here */
	    processLinks();
	    t_resize();
	    setTimeout(() => highlightCode(), 5);
	    endSpinner();
	    return {
	        success: true,
	        isEncrypted: content.marker === FILE_MARKERS.ENCRYPTED_V2
	    };
	}

	/* Helper functions for encryption / decryption */
	async function encryptContent(content, password) {
	    const encoder = new TextEncoder();
	    const data = encoder.encode(content);
	    const passwordKey = await crypto.subtle.importKey(
	        'raw',
	        encoder.encode(password),
	        { name: 'PBKDF2' },
	        false,
	        ['deriveBits', 'deriveKey']
	    );

	    const salt = crypto.getRandomValues(new Uint8Array(16));
	    const iv = crypto.getRandomValues(new Uint8Array(12));

	    const key = await crypto.subtle.deriveKey(
	        {
	            name: 'PBKDF2',
	            salt: salt,
	            iterations: 100000,
	            hash: 'SHA-256'
	        },
	        passwordKey,
	        { name: 'AES-GCM', length: 256 },
	        false,
	        ['encrypt']
	    );

	    const encrypted = await crypto.subtle.encrypt(
	        { name: 'AES-GCM', iv: iv },
	        key,
	        data
	    );

	    return {
	        encrypted: new Uint8Array(encrypted),
	        salt: salt,
	        iv: iv
	    };
	}

	async function decryptContent(encryptedData, password) {
	    const encoder = new TextEncoder();
	    const passwordKey = await crypto.subtle.importKey(
	        'raw',
	        encoder.encode(password),
	        { name: 'PBKDF2' },
	        false,
	        ['deriveBits', 'deriveKey']
	    );
	    
	    const key = await crypto.subtle.deriveKey(
	        {
	            name: 'PBKDF2',
	            salt: new Uint8Array(encryptedData.salt),
	            iterations: 100000,
	            hash: 'SHA-256'
	        },
	        passwordKey,
	        { name: 'AES-GCM', length: 256 },
	        false,
	        ['decrypt']
	    );
	    
	    try {
	        const decrypted = await crypto.subtle.decrypt(
	            { name: 'AES-GCM', iv: new Uint8Array(encryptedData.iv) },
	            key,
	            new Uint8Array(encryptedData.encrypted)
	        );
	        
	        return new TextDecoder().decode(decrypted);
	    } catch (error) {
	        throw new Error('Invalid password');
	    }
	}
	
	/* Connection Status */
	window.addEventListener('online', () => {
        get('wifi-status').style.display = 'none';
        log('Back online!');
    	isConnected = true;
    	updateFontOptions();
    	updateImageAttributes();
    });

    window.addEventListener('offline', () => {
        get('wifi-status').style.display = 'block';
        console.warn('No internet connection.');
        isConnected = false;
        updateFontOptions();
    });

	function isContentModified() {
		const element = document.querySelector('#editor');
	    return element.dataset.modified === 'true';
	}

	function resetModS() {
	    document.querySelector('#editor').dataset.modified = 'false';
	    if (document.title.includes('*')) document.title = document.title.substring(1);
	}

	window.addEventListener('beforeunload', (event) => {
	    if (isContentModified()) {
	        const confirmationMessage = 'You have unsaved changes. Are you sure you want to leave?';
	        event.returnValue = confirmationMessage;
	        return confirmationMessage;
	    }
	});

	const element = document.querySelector('#editor');
	element.addEventListener('input', () => {
        if (element.dataset.modified != 'true') {
        	document.title = `*${document.title}`;
        	element.dataset.modified = 'true';
        } else if (element.textContent === '') {
        	resetModS();
        } else return;
    });
    
    function get(item) {
	    const element = document.getElementById(item);
	    if (!element) {
	        console.error(`Element ID ${item} not found.`);
	        return null;
	    }
	    return element;
	}
	
	function toggle(selector, display) {
		if (!selector || !display) { console.error(`Invalid display [${display}] or class name [${selector}]`); return; }
		document.querySelectorAll(selector).forEach(e => {
		    e.style.display = display;
		});
	}
        	
	window.addEventListener('load', () => {
      get('editor').focus();
    });
    
    /* Event Listeners */
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            hideModal();
        }
        
        if (event.key === 'Enter') {
		    processLinks();
		}
		
		if (event.ctrlKey) {
		    if (event.key === '=') {
		    event.preventDefault();
		    changeFontSize(true);
		    } else if (event.key === '-') {
		    event.preventDefault();
		    changeFontSize(false);
		    }
	    }
	    
	    if (event.key === 'Tab') {
	        event.preventDefault();
	        if (event.shiftKey) {
	            execCmd('outdent');
	        } else if (!event.shiftKey) {
	            execCmd('indent');
	        }
	    }
    });

	document.addEventListener('DOMContentLoaded', async () => {
		    /* Save button handler */
		    get('save').onclick = (e) => {
		        e.preventDefault();
		        showSaveOptions();
		    };

		    /* Open button handler */
		    get('open').onclick = (e) => {
		        e.preventDefault();
		        dispModal('open');
		    };

		    /* File input change handler */
		   get('fileInput').onchange = async (event) => {
		    const file = event.target.files[0];
		    if (!file) return;

		    const reader = new FileReader();
		    reader.onload = async (event) => {
			    await openFile({
			        fileContent: event.target.result,
			        password: 'null',
			        editorElement: get('editor'),
			        canvasElement: get('drawingCanvas')
			    });
			    hideModal();
			};
			log("Opened file successfully!");
			
			reader.readAsText(file);
		};

		/* Functions */
		themeManager.loadTheme();
		updateFontOptions();
		
		if (!isConnected) {
			get('wifi-status').style.display = 'block';
			console.warn('No internet connection.');
		}
		
		/* Run this first */
	    if (!gtoken) await get_token();
	    
	    if (params.get('share') === "true") {
	    	openingFile();
	    	if (params.get('auth') !== '1.247aBqWEAS3') return;
	    	path = 'https://api.github.com/repos/eselagas/app.files/contents/docs/' + params.get('f');
	    	const _name = params.get('n');
	    	openFile({
	          file_path: '',
	          file_name: _name,
	          userId: userId,
	          editorElement: get('editor'),
	          canvasElement: get('drawingCanvas')
	        });
	        
	        if (params.get('share') === "multi") {
		        viewShare = false;
		        userId = params.get('user_id');
	        } else viewShare = true;
	        
			window.history.replaceState(null, '', window.location.pathname);
	    }
	    
		if (params.get('user-Pref') === 'true') {
			openingFile();
			path = 'https://api.github.com/repos/eselagas/app.files/contents/docs/' + params.get('lo_File');
			const _path = params.get('path_name');
			const name = params.get('name');
			openFile({
	          file_path: _path,
	          file_name: name,
	          userId: userId,
	          editorElement: get('editor'),
	          canvasElement: get('drawingCanvas')
	        });
	    }

	});
	
	function openingFile() {
		document.title = "Opening file...";
		if (params.has('s_h')) {
			syntax_highlight = params.get("s_h");
		}
		log("Opening file from URL params");
	}
