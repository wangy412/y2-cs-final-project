<template>
  <div id="app">
    <router-view />
  </div>
</template>

<style>
/* ---------------
      GENERAL
   --------------- */
body {
  font-family: Arial, Helvetica, sans-serif;
  margin: 0px;
  padding: 0px;
  height: 100vh;
  width: 100vw;
}

#app {
  width: 100%;
  height: 100%;
}

.dimmed {
  filter: opacity(40%);
}

/* ---------------
       LANDING
   --------------- */
#home {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
}

.container {
  border: 1px solid black;
  border-radius: 10px;

  width: 30%;

  padding: 10px;
  margin: 10px;

  transition: 1s;
}

@media screen and (max-width: 600px) {
  #home {
    flex-direction: column;
    align-items: left;
  }

  .container {
    width: 90%;
  }
}

.landing-button {
  width: 100%;
  box-sizing: border-box;
  margin-top: 10px;
}
</style>