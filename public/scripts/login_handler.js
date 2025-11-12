function getProfileIfLoggedIn() {
  if (localStorage.getItem("isLoggedIn") != "true") {
    window.location.href = "login";
    return;
  }

  const selectedProfileId = localStorage.getItem("selectedProfileId");
  const selectedProfileName = localStorage.getItem("selectedProfileName");
  const selectedProfileImage = localStorage.getItem("selectedProfileImage");

  if (!(selectedProfileId && selectedProfileName && selectedProfileImage)) {
    window.location.href = "profiles";
  }
  return [selectedProfileId, selectedProfileName, selectedProfileImage];
}

function logout() {
  localStorage.clear();
  window.location.href = "login";
}
