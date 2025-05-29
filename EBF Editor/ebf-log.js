(async () => {
    let GITHUB_TOKEN = "";
    const OWNER = "eselagas";
    const REPO = "app.files";
    const FILE_NAME = "stats.json";
    
    const ANONYMOUS_USER_ID_KEY = "anonymousUserId";
    const USER_VISIT_COUNT_KEY = "userVisitCount";
    const USER_SESSION_START_KEY = "userSessionStart";
    const LAST_ACTIVITY_KEY = "lastActivity";
    const SESSION_ID_KEY = "sessionId";
    
    const SESSION_TIMEOUT = 30 * 60 * 1000;
    const UPDATE_INTERVAL = 5 * 60 * 1000;
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;
    
    let userId = localStorage.getItem(ANONYMOUS_USER_ID_KEY) || crypto.randomUUID();
    localStorage.setItem(ANONYMOUS_USER_ID_KEY, userId);
    
    let sessionId = localStorage.getItem(SESSION_ID_KEY);
    let sessionStart = parseInt(localStorage.getItem(USER_SESSION_START_KEY));
    let lastActivity = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY));
    let visitCount = parseInt(localStorage.getItem(USER_VISIT_COUNT_KEY)) || 0;
    
    const now = Date.now();
    
    await fetchFile();
    
	async function fetchFile() {
	    try {
	        const response = await fetch("https://ethanselagea.weebly.com/uploads/1/5/0/7/150702136/token.txt");
	        if (!response.ok) {
	            throw new Error(`HTTP error! Status: ${response.status}`);
	        }
	        GITHUB_TOKEN = await response.text();
	    } catch (error) {
	        console.error("Error fetching file:", error);
	    }
	}
    
    if (!sessionId || !sessionStart || !lastActivity || (now - lastActivity) > SESSION_TIMEOUT) {
        sessionId = crypto.randomUUID();
        sessionStart = now;
        visitCount++;
        localStorage.setItem(SESSION_ID_KEY, sessionId);
        localStorage.setItem(USER_SESSION_START_KEY, sessionStart.toString());
        localStorage.setItem(USER_VISIT_COUNT_KEY, visitCount.toString());
    }
    
    lastActivity = now;
    localStorage.setItem(LAST_ACTIVITY_KEY, lastActivity.toString());
    
    const getBrowserInfo = () => {
        const ua = navigator.userAgent;
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        let browser = 'Unknown';
        let browserVersion = '';
        if (ua.includes('Chrome')) {
            browser = ua.includes('Edg') ? 'Edge' : 'Chrome';
            browserVersion = ua.match(/Chrome\/(\d+)/)?.[1] || '';
        } else if (ua.includes('Firefox')) {
            browser = 'Firefox';
            browserVersion = ua.match(/Firefox\/(\d+)/)?.[1] || '';
        } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
            browser = 'Safari';
            browserVersion = ua.match(/Version\/(\d+)/)?.[1] || '';
        }
        
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
        const deviceType = isTablet ? 'tablet' : (isMobile ? 'mobile' : 'desktop');
        
        return {
            userAgent: ua,
            browser,
            browserVersion,
            language: navigator.language,
            languages: navigator.languages || [navigator.language],
            platform: navigator.platform,
            deviceType,
            screen: `${screen.width}x${screen.height}`,
            colorDepth: screen.colorDepth,
            pixelRatio: window.devicePixelRatio || 1,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            referrer: document.referrer || "direct",
            url: location.href,
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            memory: navigator.deviceMemory || 'unknown',
            cores: navigator.hardwareConcurrency || 'unknown',
            connectionType: connection?.effectiveType || 'unknown',
            downlink: connection?.downlink || 'unknown'
        };
    };
    
    const getTimeInfo = (timestamp) => {
        const date = new Date(timestamp);
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const dayOfYear = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000)) + 1;
        const weekOfYear = Math.ceil(dayOfYear / 7);
        
        return {
            timestamp,
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate(),
            hour: date.getHours(),
            minute: date.getMinutes(),
            dayOfWeek: date.getDay(),
            dayOfYear,
            weekOfYear,
            quarter: Math.ceil((date.getMonth() + 1) / 3),
            isWeekend: date.getDay() === 0 || date.getDay() === 6,
            timeOfDay: date.getHours() < 6 ? 'night' : 
                      date.getHours() < 12 ? 'morning' :
                      date.getHours() < 18 ? 'afternoon' : 'evening'
        };
    };
    
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    const retryWithBackoff = async (fn, retries = MAX_RETRIES) => {
        for (let i = 0; i < retries; i++) {
            try {
                return await fn();
            } catch (error) {
                if (i === retries - 1) throw error;
                await sleep(RETRY_DELAY * Math.pow(2, i));
            }
        }
    };
    
    let cachedStats = null;
    let cacheSha = null;
    let lastFetch = 0;
    const CACHE_DURATION = 2 * 60 * 1000;
    
    const fetchStats = async () => {
        const now = Date.now();
        if (cachedStats && (now - lastFetch) < CACHE_DURATION) {
            return { stats: cachedStats, sha: cacheSha };
        }
        
        return retryWithBackoff(async () => {
            const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_NAME}`, {
                headers: {
                    Authorization: `Bearer ${GITHUB_TOKEN}`,
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }
            
            const { content, sha } = await response.json();
            const stats = JSON.parse(atob(content));
            
            cachedStats = stats;
            cacheSha = sha;
            lastFetch = now;

            console.log("[EBF Analytics]: Starting...");
            
            return { stats, sha };
        });

    };
    
    const initializeStats = () => ({
        uniqueUsers: {},
        totalVisits: 0,
        totalSessions: 0,
        analytics: {
            daily: {},
            hourly: {},
            weekly: {},
            monthly: {},
            quarterly: {},
            referrers: {},
            devices: {},
            browsers: {},
            locations: {},
            pages: {},
            searchParams: {},
            deviceTypes: {},
            connectionTypes: {},
            timeOfDay: {},
            sessionDurations: [],
            bounceRate: { total: 0, bounced: 0 },
            returnVisitors: { total: 0, returning: 0 }
        },
        performance: {
            avgSessionDuration: 0,
            avgPagesPerSession: 0,
            totalPageViews: 0,
            peakHours: {},
            popularPages: {},
            userEngagement: {
                highlyEngaged: 0,
                moderatelyEngaged: 0,
                quickVisits: 0
            }
        },
        metadata: {
            lastUpdated: Date.now(),
            version: "2.0"
        }
    });
    
    const trackActivity = () => {
        lastActivity = Date.now();
        localStorage.setItem(LAST_ACTIVITY_KEY, lastActivity.toString());
    };
        
    ['click', 'keydown', 'mousemove', 'touchstart'].forEach(event => {
        document.addEventListener(event, trackActivity, { passive: true });
    });
        
    let isVisible = !document.hidden;
    let visibilityStart = Date.now();
    
    const updateAnalytics = async () => {
        try {
            let { stats, sha } = await fetchStats();
            
            if (!stats || typeof stats !== 'object') {
                stats = initializeStats();
                sha = null;
            }
            
            if (!stats.analytics) stats.analytics = {};
            if (!stats.performance) stats.performance = {};
            if (!stats.metadata) stats.metadata = {};
            if (!stats.uniqueUsers) stats.uniqueUsers = {};
            
            Object.assign(stats.analytics, {
                daily: stats.analytics.daily || {},
                hourly: stats.analytics.hourly || {},
                weekly: stats.analytics.weekly || {},
                monthly: stats.analytics.monthly || {},
                quarterly: stats.analytics.quarterly || {},
                referrers: stats.analytics.referrers || {},
                devices: stats.analytics.devices || {},
                browsers: stats.analytics.browsers || {},
                locations: stats.analytics.locations || {},
                pages: stats.analytics.pages || {},
                searchParams: stats.analytics.searchParams || {},
                deviceTypes: stats.analytics.deviceTypes || {},
                connectionTypes: stats.analytics.connectionTypes || {},
                timeOfDay: stats.analytics.timeOfDay || {},
                sessionDurations: stats.analytics.sessionDurations || [],
                bounceRate: stats.analytics.bounceRate || { total: 0, bounced: 0 },
                returnVisitors: stats.analytics.returnVisitors || { total: 0, returning: 0 }
            });
            
            if (!stats.performance.userEngagement) {
                stats.performance.userEngagement = {
                    highlyEngaged: 0,
                    moderatelyEngaged: 0,
                    quickVisits: 0
                };
            }
            
            const currentTime = Date.now();
            const sessionDuration = currentTime - sessionStart;
            const browserInfo = getBrowserInfo();
            const timeInfo = getTimeInfo(currentTime);
            
            const safeHour = Math.max(0, Math.min(23, timeInfo.hour));
            const safeDayOfWeek = Math.max(0, Math.min(6, timeInfo.dayOfWeek));
            const safeMonth = Math.max(0, Math.min(11, timeInfo.month - 1));
            
            const isNewUser = !stats.uniqueUsers[userId];
            
            if (isNewUser) {
                stats.uniqueUsers[userId] = {
                    totalAccesses: 0,
                    totalSessions: 0,
                    firstVisit: currentTime,
                    lastAccess: currentTime,
                    sessions: [],
                    devices: [],
                    referrers: [],
                    pages: [],
                    totalTimeSpent: 0,
                    avgSessionDuration: 0,
                    timePatterns: {
                        hourly: new Array(24).fill(0),
                        daily: new Array(7).fill(0),
                        monthly: new Array(12).fill(0)
                    }
                };
            }
            
            const user = stats.uniqueUsers[userId];
            
            user.devices = user.devices || [];
            user.referrers = user.referrers || [];
            user.pages = user.pages || [];
            user.sessions = user.sessions || [];
            
            if (!user.timePatterns || !Array.isArray(user.timePatterns.hourly) || user.timePatterns.hourly.length !== 24) {
                user.timePatterns = {
                    hourly: new Array(24).fill(0),
                    daily: new Array(7).fill(0),
                    monthly: new Array(12).fill(0)
                };
            }
            
            user.totalAccesses++;
            user.lastAccess = currentTime;
            user.totalTimeSpent += sessionDuration;
            
            const sessionData = {
                id: sessionId,
                start: sessionStart,
                duration: sessionDuration,
                timestamp: currentTime,
                page: browserInfo.pathname,
                referrer: browserInfo.referrer,
                device: browserInfo.deviceType,
                browser: browserInfo.browser,
                isNewSession: user.sessions.length === 0 || 
                             !user.sessions.some(s => s.id === sessionId)
            };
            
            const existingSessionIndex = user.sessions.findIndex(s => s.id === sessionId);
            if (existingSessionIndex >= 0) {
                user.sessions[existingSessionIndex] = sessionData;
            } else {
                user.sessions.push(sessionData);
                user.totalSessions++;
                stats.totalSessions++;
            }
            
            if (user.sessions.length > 50) {
                user.sessions = user.sessions.slice(-50);
            }
            
            if (user.timePatterns.hourly && safeHour >= 0 && safeHour < 24) {
                user.timePatterns.hourly[safeHour]++;
            }
            if (user.timePatterns.daily && safeDayOfWeek >= 0 && safeDayOfWeek < 7) {
                user.timePatterns.daily[safeDayOfWeek]++;
            }
            if (user.timePatterns.monthly && safeMonth >= 0 && safeMonth < 12) {
                user.timePatterns.monthly[safeMonth]++;
            }
            
            user.avgSessionDuration = user.totalSessions > 0 ? user.totalTimeSpent / user.totalSessions : 0;
            
            const deviceString = `${browserInfo.platform}-${browserInfo.browser}`;
            if (!user.devices.includes(deviceString)) {
                user.devices.push(deviceString);
            }
            if (!user.referrers.includes(browserInfo.referrer)) {
                user.referrers.push(browserInfo.referrer);
            }
            if (!user.pages.includes(browserInfo.pathname)) {
                user.pages.push(browserInfo.pathname);
            }
            
            if (sessionData.isNewSession) {
                stats.totalVisits++;
            }
            
            const dateKey = `${timeInfo.year}-${String(timeInfo.month).padStart(2, '0')}-${String(timeInfo.day).padStart(2, '0')}`;
            const weekKey = `${timeInfo.year}-W${String(timeInfo.weekOfYear).padStart(2, '0')}`;
            const monthKey = `${timeInfo.year}-${String(timeInfo.month).padStart(2, '0')}`;
            const quarterKey = `${timeInfo.year}-Q${timeInfo.quarter}`;
            
            stats.analytics.daily[dateKey] = (stats.analytics.daily[dateKey] || 0) + 1;
            stats.analytics.weekly[weekKey] = (stats.analytics.weekly[weekKey] || 0) + 1;
            stats.analytics.monthly[monthKey] = (stats.analytics.monthly[monthKey] || 0) + 1;
            stats.analytics.quarterly[quarterKey] = (stats.analytics.quarterly[quarterKey] || 0) + 1;
            stats.analytics.hourly[safeHour] = (stats.analytics.hourly[safeHour] || 0) + 1;
            stats.analytics.timeOfDay[timeInfo.timeOfDay] = (stats.analytics.timeOfDay[timeInfo.timeOfDay] || 0) + 1;
            
            stats.analytics.referrers[browserInfo.referrer] = (stats.analytics.referrers[browserInfo.referrer] || 0) + 1;
            stats.analytics.devices[browserInfo.platform] = (stats.analytics.devices[browserInfo.platform] || 0) + 1;
            stats.analytics.browsers[browserInfo.browser] = (stats.analytics.browsers[browserInfo.browser] || 0) + 1;
            stats.analytics.locations[browserInfo.timezone] = (stats.analytics.locations[browserInfo.timezone] || 0) + 1;
            stats.analytics.pages[browserInfo.pathname] = (stats.analytics.pages[browserInfo.pathname] || 0) + 1;
            stats.analytics.deviceTypes[browserInfo.deviceType] = (stats.analytics.deviceTypes[browserInfo.deviceType] || 0) + 1;
            stats.analytics.connectionTypes[browserInfo.connectionType] = (stats.analytics.connectionTypes[browserInfo.connectionType] || 0) + 1;
            
            if (browserInfo.search) {
                try {
                    const params = new URLSearchParams(browserInfo.search);
                    params.forEach((value, key) => {
                        if (['utm_source', 'utm_medium', 'utm_campaign'].includes(key)) {
                            const paramKey = `${key}=${value}`;
                            stats.analytics.searchParams[paramKey] = (stats.analytics.searchParams[paramKey] || 0) + 1;
                        }
                    });
                } catch (e) {
                    console.warn('Error parsing search parameters:', e);
                }
            }
            
            stats.analytics.sessionDurations.push(sessionDuration);
            if (stats.analytics.sessionDurations.length > 1000) {
                stats.analytics.sessionDurations = stats.analytics.sessionDurations.slice(-1000);
            }
            
            stats.analytics.bounceRate.total++;
            if (sessionDuration < 10000) {
                stats.analytics.bounceRate.bounced++;
            }
            
            stats.analytics.returnVisitors.total++;
            if (!isNewUser) {
                stats.analytics.returnVisitors.returning++;
            }
            
            const allDurations = stats.analytics.sessionDurations;
            stats.performance.avgSessionDuration = allDurations.length > 0 ? 
                allDurations.reduce((a, b) => a + b, 0) / allDurations.length : 0;
            
            stats.performance.totalPageViews = Object.values(stats.analytics.pages).reduce((a, b) => a + b, 0);
            stats.performance.avgPagesPerSession = stats.totalSessions > 0 ? 
                stats.performance.totalPageViews / stats.totalSessions : 0;
            
            const sessionMinutes = sessionDuration / (1000 * 60);
            if (sessionMinutes > 5) {
                stats.performance.userEngagement.highlyEngaged++;
            } else if (sessionMinutes > 1) {
                stats.performance.userEngagement.moderatelyEngaged++;
            } else {
                stats.performance.userEngagement.quickVisits++;
            }
            
            try {
                stats.performance.popularPages = Object.entries(stats.analytics.pages)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 10)
                    .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {});
            } catch (e) {
                console.warn('Error updating popular pages:', e);
                stats.performance.popularPages = {};
            }
            
            stats.metadata.lastUpdated = currentTime;
            stats.metadata.version = "2.0";
            
            const content = btoa(JSON.stringify(stats, null, 2));
            
            await retryWithBackoff(async () => {
                const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_NAME}`, {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${GITHUB_TOKEN}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        message: `Analytics update - User ${userId.slice(0, 8)} - Session ${sessionId.slice(0, 8)} - Duration ${Math.round(sessionDuration/1000)}s`,
                        content: content,
                        sha: sha
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`GitHub API Error: ${response.status}`);
                }
                
                const responseData = await response.json();
                cachedStats = stats;
                cacheSha = responseData.content.sha;
            });
            
            console.log("[EBF Analytics]: Analytics updated successfully.");
            
        } catch (error) {
            console.error("Analytics update failed:", error);
        }
    };
    
    await updateAnalytics();
    
    const updateInterval = setInterval(updateAnalytics, UPDATE_INTERVAL);
    
    const cleanup = async () => {
        clearInterval(updateInterval);
        
        if (navigator.sendBeacon) {
            try {
                const finalData = {
                    userId: userId.slice(0, 8),
                    sessionId: sessionId.slice(0, 8),
                    duration: Date.now() - sessionStart
                };
                
                navigator.sendBeacon('/analytics-beacon', JSON.stringify(finalData));
            } catch (e) {
                await updateAnalytics();
            }
        } else {
            await updateAnalytics();
        }
    };
    
    window.addEventListener("beforeunload", cleanup);
    window.addEventListener("pagehide", cleanup);
    
    window.addEventListener("focus", () => {
        if (!isVisible) {
            isVisible = true;
            visibilityStart = Date.now();
        }
    });
    
    window.addEventListener("blur", () => {
        if (isVisible) {
            isVisible = false;
        }
    });
    
    window.analytics = {
        getUserId: () => userId.slice(0, 8),
        getSessionId: () => sessionId.slice(0, 8),
        getSessionDuration: () => Date.now() - sessionStart,
        forceUpdate: updateAnalytics
    };
    
})();