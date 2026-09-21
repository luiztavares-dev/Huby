import { Route, Routes } from 'react-router-dom'
import { Home } from './pages/home/Home'
import { Eventos } from './pages/eventos/Eventos'
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
      </Routes>
    </>
  )
}

export default App
