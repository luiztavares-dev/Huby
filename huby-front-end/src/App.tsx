import { Route, Routes } from 'react-router-dom'

import { Home } from './pages/home/Home'
import { Eventos } from './pages/eventos/Eventos'
import { Pagina404 } from "./pages/404/404"
import { Standart } from './layouts/standart/Standart';
import { Comunidades } from './pages/comunidades/Comunidades';
import { Carrinho } from './pages/carrinho/Carrinho';
import { Configuracoes } from './pages/configuracoes/Configuracoes';
import { Login } from './pages/login/Login';
import { Perfil } from './pages/perfil/Perfil';
import { Biblioteca } from './pages/biblioteca/Biblioteca'

import './index.css'

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
        <Route path="/biblioteca" element={<Standart page={<Biblioteca />} activeLink="biblioteca" />} />
        <Route path="/comunidades" element={<Standart page={<Comunidades />} activeLink="comunidades" />} />
        <Route path="/carrinho" element={<Standart page={<Carrinho />} activeLink="carrinho" />} />
        <Route path="/configuracoes" element={<Standart page={<Configuracoes />} activeLink="configuracoes" />} />
        <Route path="/perfil" element={<Standart page={<Perfil />} activeLink="perfil" />} />

        <Route path="/login" element={<Login />} />
      </Routes>
    </>
  )
}

export default App
