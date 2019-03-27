document.addEventListener('DOMContentLoaded', function(e) {
  function initNavDraw() {
    var drawer = new mdc.drawer.MDCTemporaryDrawer(
        document.querySelector('.mdc-drawer--temporary'));

    var drawerButton = document.getElementById('nav-menu-button');

    drawerButton.addEventListener('click', function() {
      drawer.open = true;
    });
  }

  initNavDraw();
});
