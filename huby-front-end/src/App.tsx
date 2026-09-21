import { Route, Routes } from 'react-router-dom'
import { Home } from './pages/home/Home'
import { Eventos } from './pages/eventos/Eventos'
import { Pagina404 } from "./pages/404/404"
import { Standart } from './layouts/standart/Standart';
import './Index.css'

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Standart page={<Home />} activeLink="home" />} />
        <Route path="/eventos" element={<Standart page={<Eventos />} activeLink="eventos" />} />
        <Route path="/biblioteca" element={<Standart page={<Eventos />} activeLink="biblioteca" />} />
        <Route path="/comunidades" element={<Standart page={<Eventos />} activeLink="comunidades" />} />
        <Route path="/carrinho" element={<Standart page={<Eventos />} activeLink="carrinho" />} />
        <Route path="/configuracoes" element={<Standart page={<Eventos />} activeLink="configuracoes" />} />
        <Route path="/*" element={<Standart page={<Pagina404 />} activeLink="404" />} />
      </Routes>
    </>
  )
}

export default App
