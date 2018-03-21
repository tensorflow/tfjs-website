document.addEventListener('DOMContentLoaded', function(e) {
  function initNavDraw() {
    const drawer = new mdc.drawer.MDCTemporaryDrawer(
        document.querySelector('.mdc-drawer--temporary'));

    const drawerButton = document.getElementById('nav-menu-button');

    drawerButton.addEventListener('click', () => {
      drawer.open = true;
    });
  }

  initNavDraw();
});
