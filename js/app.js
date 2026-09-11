function showMessage() {
    document.getElementById("student-tools").scrollIntoView({
        behavior: "smooth"
    });
}

document.addEventListener("DOMContentLoaded", function() {

    const toolsGrid = document.querySelector("#student-tools .grid");
    if (toolsGrid && !document.getElementById("smart-writer-card")) {
        const card = document.createElement("div");
        card.className = "card";
        card.id = "smart-writer-card";
        card.innerHTML = '<div class="icon">✍️</div><h3>Smart Writer</h3><p>Write freely by hand or use your voice to create a digital book.</p><button onclick="location.href=\'tools/smart-writer/index.html\'">Open</button>';
        toolsGrid.appendChild(card);
    }

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
