
const SUPABASE_URL = "https://axfpbiehxtokbcompamr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_dCDTYxU_J88EX5GtF4FsRg_rJXQDSlb";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

// Keep track of the current user
let currentUser = null;

// Show login and registration forms
function createAuthModal() {
    if (document.getElementById("authModal")) return;

    const modal = document.createElement("div");
    modal.id = "authModal";

    modal.innerHTML = `
        <div style="
            position:fixed; inset:0; background:rgba(0,0,0,.75);
            display:flex; align-items:center; justify-content:center;
            z-index:9999; padding:20px;">
            <div style="
                background:#fff; color:#222; padding:28px;
                border-radius:14px; width:100%; max-width:400px;">
                <h2 id="authTitle">Login to NexusEvents</h2>

                <form id="authForm">
                    <label for="authEmail">Email</label>
                    <input id="authEmail" type="email" required
                        autocomplete="email"
                        style="display:block;width:100%;padding:10px;
                        margin:8px 0 15px;box-sizing:border-box;">

                    <label for="authPassword">Password</label>
                    <input id="authPassword" type="password" required
                        minlength="6" autocomplete="current-password"
                        style="display:block;width:100%;padding:10px;
                        margin:8px 0 15px;box-sizing:border-box;">

                    <button type="submit" id="authSubmit"
                        style="padding:10px 16px;cursor:pointer;">
                        Login
                    </button>

                    <p id="authMessage" role="status"></p>
                </form>

                <button type="button" id="switchAuth"
                    style="border:0;background:none;color:#2457d6;
                    cursor:pointer;padding:8px 0;">
                    Need an account? Register
                </button>

                <br>
                <button type="button" id="closeAuth"
                    style="padding:8px 12px;cursor:pointer;">
                    Close
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    let isRegister = false;

    document.getElementById("switchAuth").addEventListener("click", () => {
        isRegister = !isRegister;

        document.getElementById("authTitle").textContent =
            isRegister ? "Create an Account" : "Login to NexusEvents";

        document.getElementById("authSubmit").textContent =
            isRegister ? "Register" : "Login";

        document.getElementById("switchAuth").textContent =
            isRegister
                ? "Already have an account? Login"
                : "Need an account? Register";

        document.getElementById("authPassword").autocomplete =
            isRegister ? "new-password" : "current-password";

        document.getElementById("authMessage").textContent = "";
    });

    document.getElementById("closeAuth").addEventListener("click", () => {
        modal.remove();
    });

    document.getElementById("authForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("authEmail").value.trim();
        const password = document.getElementById("authPassword").value;
        const message = document.getElementById("authMessage");
        const submitButton = document.getElementById("authSubmit");

        submitButton.disabled = true;
        message.textContent = "Please wait...";

        try {
            let result;

            if (isRegister) {
                result = await supabaseClient.auth.signUp({
                    email,
                    password
                });
            } else {
                result = await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });
            }

            if (result.error) throw result.error;

            if (isRegister && !result.data.session) {
                message.textContent =
                    "Account created. Check your email if confirmation is required.";
            } else {
                message.textContent = "Success!";

                setTimeout(() => {
                    modal.remove();
                    updateAuthStatus();
                    loadEvents();
                }, 500);
            }
        } catch (error) {
            message.textContent = error.message || "Authentication failed.";
        } finally {
            submitButton.disabled = false;
        }
    });
}

// Update login/logout buttons
async function updateAuthStatus() {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error) {
        console.warn("Could not retrieve user:", error.message);
    }

    currentUser = data?.user || null;

    const loginButtons = document.querySelectorAll(
        "#loginBtn, #getStartedBtn, .login-btn, .get-started-btn"
    );

    loginButtons.forEach((button) => {
        if (button.dataset.authHandler === "true") return;

        button.dataset.authHandler = "true";

        button.addEventListener("click", async (event) => {
            event.preventDefault();

            const { data: userData } = await supabaseClient.auth.getUser();

            if (userData?.user) {
                const shouldLogout = confirm(
                    "You are logged in. Do you want to log out?"
                );

                if (shouldLogout) {
                    const { error: logoutError } =
                        await supabaseClient.auth.signOut();

                    if (logoutError) {
                        alert(logoutError.message);
                    } else {
                        alert("Logged out successfully.");
                        updateAuthStatus();
                    }
                }
            } else {
                createAuthModal();
            }
        });
    });

    let authStatus = document.getElementById("authStatus");

    if (!authStatus) {
        authStatus = document.createElement("p");
        authStatus.id = "authStatus";

        const navbar = document.querySelector("nav") ||
            document.querySelector("header");

        if (navbar) {
            navbar.appendChild(authStatus);
        } else {
            document.body.prepend(authStatus);
        }
    }

    authStatus.textContent = currentUser
        ? `Logged in: ${currentUser.email}`
        : "Not logged in";
}

// Load events from Supabase
async function loadEvents() {
    const eventsGrid = document.getElementById("eventsGrid");
    const eventStatus = document.getElementById("eventStatus");

    if (!eventsGrid) {
        console.error('Missing element with id="eventsGrid".');
        return;
    }

    if (eventStatus) {
        eventStatus.textContent = "Loading events...";
    }

    const { data: events, error } = await supabaseClient
        .from("events")
        .select("id,title,description,category,event_date,location,image_url")
        .order("event_date", { ascending: true, nullsFirst: false });

    if (error) {
        console.error("Error loading events:", error.message);

        if (eventStatus) {
            eventStatus.textContent =
                "Could not load events. Check the database connection.";
        }

        return;
    }

    eventsGrid.replaceChildren();

    if (!events || events.length === 0) {
        if (eventStatus) {
            eventStatus.textContent = "No events available yet.";
        }
        return;
    }

    events.forEach((event) => {
        const card = document.createElement("article");
        card.className = "event-card";

        if (event.image_url) {
            const image = document.createElement("img");
            image.src = event.image_url;
            image.alt = event.title || "Event image";
            image.loading = "lazy";
            image.style.width = "100%";
            image.style.objectFit = "cover";

            image.onerror = () => image.remove();
            card.appendChild(image);
        }

        const content = document.createElement("div");
        content.className = "event-card-content";

        const title = document.createElement("h3");
        title.textContent = event.title || "Untitled Event";
        content.appendChild(title);

        if (event.category) {
            const category = document.createElement("p");
            category.className = "event-category";
            category.textContent = event.category;
            content.appendChild(category);
        }

        if (event.description) {
            const description = document.createElement("p");
            description.textContent = event.description;
            content.appendChild(description);
        }

        if (event.event_date) {
            const date = document.createElement("p");
            const parsedDate = new Date(event.event_date);

            date.textContent = Number.isNaN(parsedDate.getTime())
                ? event.event_date
                : parsedDate.toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short"
                });

            content.appendChild(date);
        }

        if (event.location) {
            const location = document.createElement("p");
            location.textContent = `Location: ${event.location}`;
            content.appendChild(location);
        }

        card.appendChild(content);
        eventsGrid.appendChild(card);
    });

    if (eventStatus) {
        eventStatus.textContent =
            `${events.length} event(s) loaded from Supabase successfully.`;
    }
}

// Enable automatic updates when the events table changes
function setupRealtime() {
    const eventsChannel = supabaseClient
        .channel("events-live-updates")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "events"
            },
            (payload) => {
                console.log("Realtime event received:", payload.eventType);
                loadEvents();
            }
        )
        .subscribe((status) => {
            console.log("Realtime subscription status:", status);
        });

    return eventsChannel;
}

// Start the website
async function initializeWebsite() {
    await updateAuthStatus();
    await loadEvents();
    setupRealtime();
}

supabaseClient.auth.onAuthStateChange(() => {
    updateAuthStatus();
});

initializeWebsite();
