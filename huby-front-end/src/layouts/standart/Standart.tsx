import './Standart.css'
import type { ReactElement } from 'react'

import { Navbar } from '../../components/navbar/Navbar'

interface StandartProps {
    page: ReactElement<React.JSXElementConstructor<any> | string>
    activeLink?: String
}

export function Standart ({page, activeLink}: StandartProps) {
    return (
        <>
            <div className="standart">
                <Navbar activeLink={activeLink} />
                <div className="standart-main">{page}</div>
            </div>
        </>
    )
}