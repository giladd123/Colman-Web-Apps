async function getSession() {
  try {
    const response = await fetch("/api/user/session", {
      method: "GET",
      credentials: "same-origin", // Critical: includes session cookie
    });

    if (!response.ok) {
      console.error("Failed to fetch session");
      return {
        isAuthenticated: false,
        userId: null,
        selectedProfileId: null,
        selectedProfileName: null,
        selectedProfileImage: null,
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching session:", error);
    return {
      isAuthenticated: false,
      userId: null,
      selectedProfileId: null,
      selectedProfileName: null,
      selectedProfileImage: null,
    };
  }
}

async function logout() {
  try {
    const response = await fetch("/api/user/logout", {
      method: "POST",
      credentials: "same-origin",
    });

    if (response.ok) {
      window.location.href = "/login";
    } else {
      console.error("Logout failed");
      window.location.href = "/login";
    }
  } catch (error) {
    console.error("Error during logout:", error);
    window.location.href = "/login";
  }
}

function getProfileIfLoggedIn() {
  console.warn(
    "DEPRECATED: getProfileIfLoggedIn() is deprecated. Use getSession() instead."
  );
  // Return empty array to prevent breakage, but log warning
  return [null, null, null];
}

function updateTooltip(el, text) {
  try {
    const inst = bootstrap.Tooltip.getInstance(el);
    if (inst) inst.dispose();
  } catch (e) {}
  el.setAttribute("title", text);
  el.setAttribute("data-bs-original-title", text);
  new bootstrap.Tooltip(el);
}

function chunkArray(items, chunkSize) {
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

function updateHelloMessages(profileName) {
  const safeName = (profileName || "").trim();
  const greeting = safeName ? `Hello, ${safeName}` : "Hello";

  document
    .querySelectorAll("#helloMessage, #helloMessageMobile")
    .forEach((element) => {
      element.textContent = greeting;
    });
}
