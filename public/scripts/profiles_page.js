// Gilad-Tidhar-325767929-Rotem-Batstein-325514917-Shani-Bashari-325953743

function createProfileElement(document, profile) {
  const profilesContainer = document.querySelector(".profiles");

  const profileDiv = document.createElement("div");
  profileDiv.className = "profile";
  profileDiv.setAttribute("role", "button");
  profileDiv.setAttribute("tabindex", "0");
  profileDiv.setAttribute("profileid", profile.name);

  const img = document.createElement("img");
  img.src = profile.image || profile.avatar || "/images/profiles/green.png";
  img.alt = profile.name;

  const profileNameDiv = document.createElement("div");
  profileNameDiv.className = "profile-name";

  const input = document.createElement("input");
  input.type = "text";
  input.value = profile.name;
  img.onclick = () => {
    saveProfile(input, img);
  };

  // set data attribute to real id if present
  if (profile.id) {
    profileDiv.setAttribute("profileid", profile.id);
  } else if (profile._id) {
    profileDiv.setAttribute("profileid", profile._id);
  }

  profileNameDiv.appendChild(input);
  profileDiv.appendChild(img);
  profileDiv.appendChild(profileNameDiv);
  profilesContainer.appendChild(profileDiv);
}

function saveProfile(input, img) {
  localStorage.setItem("selectedProfileName", input.value);
  localStorage.setItem("selectedProfileImage", img.src);
  window.location.href = "main";
}

// Fetch profiles from server for current user and render them
async function loadProfiles() {
  const profilesContainer = document.querySelector(".profiles");
  profilesContainer.innerHTML = "";
  const userId = localStorage.getItem("userId");
  if (!userId) {
    profilesContainer.textContent = "No user selected.";
    return;
  }

  try {
    const res = await fetch(`/api/profiles/user/${userId}`);
    if (!res.ok) {
      profilesContainer.textContent = "Failed to load profiles.";
      return;
    }
    const profiles = await res.json();
    if (!Array.isArray(profiles) || profiles.length === 0) {
      profilesContainer.textContent = "No profiles found.";
      return;
    }

    profiles.forEach((p) => {
      // map server profile to shape expected by createProfileElement
      const profile = {
        name: p.name,
        image: p.avatar || "/images/profiles/green.png",
        id: p._id,
      };
      createProfileElement(document, profile);
    });
  } catch (err) {
    console.error("Error loading profiles:", err);
    profilesContainer.textContent = "Failed to load profiles.";
  }
}
