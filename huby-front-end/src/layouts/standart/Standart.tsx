import './Standart.css'
import type { ReactElement } from 'react'

import { Navbar } from '../../components/navbar/Navbar'
import { Footer } from '../../components/footer/Footer'

interface StandartProps {
    page: ReactElement<React.JSXElementConstructor<any> | string>
    activeLink?: string
}

export function Standart ({page, activeLink}: StandartProps) {
    return (
        <>
            <div className="standart">
                <Navbar activeLink={activeLink} />
                <main className="standart-main">
                    <div className="standart-page">{page}</div>
                    {activeLink !== 'comunidades' && <Footer />}
                </main>
            </div>
        </>
    )
}