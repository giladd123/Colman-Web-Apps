function getProfileIfLoggedIn() {
  if (localStorage.getItem("isLoggedIn") != "true") {
    window.location.href = "login";
    return;
  }

  const selectedProfileName = localStorage.getItem("selectedProfileName");
  const selectedProfileImage = localStorage.getItem("selectedProfileImage");
  const selectedProfileId = localStorage.getItem("selectedProfileId");

  if (!(selectedProfileName && selectedProfileImage && selectedProfileId)) {
    window.location.href = "profiles";
  }
  return [selectedProfileName, selectedProfileImage, selectedProfileId];
}

function logout() {
  localStorage.clear();
  window.location.href = "login";
}
