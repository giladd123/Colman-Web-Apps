async function getProfileIfLoggedIn() {
  const session = await getSession();

  if (!session || !session.isAuthenticated) {
    window.location.href = "/login";
    return null;
  }

  if (
    !session.selectedProfileId ||
    !session.selectedProfileName ||
    !session.selectedProfileImage
  ) {
    window.location.href = "/profiles";
    return null;
  }

  return [
    session.selectedProfileId,
    session.selectedProfileName,
    session.selectedProfileImage,
  ];
}

async function logout() {
  try {
    const response = await fetch("/api/user/logout", {
      method: "POST",
      credentials: "same-origin", // Include session cookie
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
