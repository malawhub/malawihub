function showMessage() {
    document.getElementById("student-tools").scrollIntoView({
        behavior: "smooth"
    });
}

document.addEventListener("DOMContentLoaded", function() {

    const searchBox = document.getElementById("toolSearch");
    const cards = document.querySelectorAll(".card");

    if (!searchBox) return;

    searchBox.addEventListener("input", function() {

        const query = searchBox.value.toLowerCase().trim();

        cards.forEach(function(card) {

            const title = card.querySelector("h3");
            const description = card.querySelector("p");

            const titleText = title ? title.textContent.toLowerCase() : "";
            const descriptionText = description ? description.textContent.toLowerCase() : "";

            const matches =
                query === "" ||
                titleText.includes(query) ||
                descriptionText.includes(query);

            card.style.display = matches ? "" : "none";
        });

    });

});
