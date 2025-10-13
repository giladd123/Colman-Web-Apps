// Gilad-Tidhar-325767929-Rotem-Batstein-325514917-Shani-Bashari-325953743

function createProfileElement(document, profile) {
  const profilesContainer = document.querySelector(".profiles");

  const profileDiv = document.createElement("div");
  profileDiv.className = "profile";
  profileDiv.setAttribute("role", "button");
  profileDiv.setAttribute("tabindex", "0");
  profileDiv.setAttribute("profileid", name);

  const img = document.createElement("img");
  img.src = profile.image;
  img.alt = profile.name;

  const profileNameDiv = document.createElement("div");
  profileNameDiv.className = "profile-name";

  const input = document.createElement("input");
  input.type = "text";
  input.value = profile.name;
  img.onclick = () => {
    saveProfile(input, img);
  };

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
