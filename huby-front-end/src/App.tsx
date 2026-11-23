import { Route, Routes } from 'react-router-dom'

import { Home } from './pages/home/Home'
import { Eventos } from './pages/eventos/Eventos'
import { InscricaoEvento } from './pages/eventos/Inscricao'
import { EquipesInscritas } from './pages/eventos/EquipesInscritas'
import { Pagina404 } from "./pages/404/404"
import { Standart } from './layouts/standart/Standart';
import { Comunidades } from './pages/comunidades/Comunidades';
import { Carrinho } from './pages/carrinho/Carrinho';
import { Configuracoes } from './pages/configuracoes/Configuracoes';
import { Login } from './pages/login/Login';
import { Perfil } from './pages/perfil/Perfil';
import { Biblioteca } from './pages/biblioteca/Biblioteca'
import './index.css'
import {Cadastro} from './pages/login/Cadastro';
import { Mensagens } from './pages/Mensagens/Mensagens';
import { CriarEvento } from './pages/eventos/CriarEvento';




function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Standart page={<Home />} activeLink="home" />} />
        <Route path="/eventos" element={<Standart page={<Eventos />} activeLink="eventos" />} />
        <Route path="/eventos/criar" element={<Standart page={<CriarEvento />} activeLink="eventos" />} />
        <Route path="/eventos/:id/inscricao" element={<Standart page={<InscricaoEvento />} activeLink="eventos" />} />
        <Route path="/eventos/:id/equipes" element={<Standart page={<EquipesInscritas />} activeLink="eventos" />} />
        <Route path="/comunidades" element={<Standart page={<Comunidades />} activeLink="comunidades" />} />
        <Route path="/*" element={<Standart page={<Pagina404 />} activeLink="404" />} />
        <Route path="/biblioteca" element={<Standart page={<Biblioteca />} activeLink="biblioteca" />} />
        <Route path="/carrinho" element={<Standart page={<Carrinho />} activeLink="carrinho" />} />
        <Route path="/configuracoes" element={<Standart page={<Configuracoes />} activeLink="configuracoes" />} />
        <Route path="/perfil" element={<Standart page={<Perfil />} activeLink="perfil" />} />
        <Route path="/perfil/:id" element={<Standart page={<Perfil />} activeLink="perfil" />} />
        <Route path="/mensagens" element={<Mensagens />} />
        <Route path="/mensagens/:id" element={<Mensagens />} />
       <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Cadastro />} />
      </Routes>
    </>
  )
}

export default App
