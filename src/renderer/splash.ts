import { querySplashElements } from './splash/querySplashElements';
import { SplashScreen } from './splash/SplashScreen';

const screen = new SplashScreen(querySplashElements());
window.splashApi.onStatus((status) => screen.apply(status));
void window.splashApi.getVersion().then((version) => screen.showVersion(version));
