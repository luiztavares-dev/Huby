import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import './Perfil.css';

interface UsuarioData {
  id: string;
  login: string;
  nomeExibicao: string;
  username: string;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
  instagram: string;
  discord: string;
  twitter: string;
  tiktok: string;
  steam: string;
  itchIo: string;
}


const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg', 0.9);
  });
}


export function Perfil() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UsuarioData | null>(null);
  
  const [editandoBio, setEditandoBio] = useState(false);
  const [editandoRedes, setEditandoRedes] = useState(false);
  const [editandoMidia, setEditandoMidia] = useState(false);
  const [editandoIdentidade, setEditandoIdentidade] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'publicados' | 'criados' | 'participados'>('publicados');
  const [salvando, setSalvando] = useState(false);

 
  const [imagemParaCortar, setImagemParaCortar] = useState<string | null>(null);
  const [tipoCrop, setTipoCrop] = useState<'avatarUrl' | 'bannerUrl'>('avatarUrl');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  useEffect(() => {
    const dadosSalvos = localStorage.getItem('huby_user');
    if (!dadosSalvos) {
      navigate('/login');
      return;
    }
    
    const usuarioLocal = JSON.parse(dadosSalvos);
    setUser(usuarioLocal);

    fetch(`http://localhost:8080/api/perfil/${usuarioLocal.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((usuarioDaNuvem) => {
        if (usuarioDaNuvem) {
          setUser(usuarioDaNuvem);
          localStorage.setItem('huby_user', JSON.stringify(usuarioDaNuvem));
        }
      })
      .catch((err) => console.error('Erro ao buscar perfil no servidor:', err));
  }, [navigate]);

  async function salvarNoBanco(novosDados: Partial<UsuarioData>) {
    if (!user) return;
    setSalvando(true);
    const payload = { ...user, ...novosDados };

    try {
      const resposta = await fetch(`http://localhost:8080/api/perfil/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (resposta.ok) {
        const atualizado = await resposta.json();
        setUser(atualizado);
        setEditandoBio(false);
        setEditandoRedes(false);
        setEditandoMidia(false);
        setEditandoIdentidade(false);
        localStorage.setItem('huby_user', JSON.stringify(atualizado));
        window.dispatchEvent(new Event('huby_avatar_atualizado'));
      }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
    } finally {
      setSalvando(false);
    }
  }


  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>, tipo: 'avatarUrl' | 'bannerUrl') => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.readAsDataURL(file);
      });
      setTipoCrop(tipo);
      setImagemParaCortar(imageDataUrl);
      setEditandoMidia(false); 
    }
  };

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);


  const handleUploadCortado = async () => {
    if (!imagemParaCortar || !croppedAreaPixels) return;
    setSalvando(true);

    try {
      const croppedImageBlob = await getCroppedImg(imagemParaCortar, croppedAreaPixels);
      if (!croppedImageBlob) return;

      const formData = new FormData();
      formData.append('file', croppedImageBlob);
      formData.append('upload_preset', uploadPreset);

      const resCloudinary = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: formData }
      );

      const dadosCloudinary = await resCloudinary.json();

      if (dadosCloudinary.secure_url) {
        await salvarNoBanco({ [tipoCrop]: dadosCloudinary.secure_url });
        setImagemParaCortar(null); 
      }
    } catch (error) {
      console.error('Erro ao fazer upload da imagem cortada:', error);
    } finally {
      setSalvando(false);
    }
  };

  if (!user) return null;

  return (
    <div className="perfil-wrapper">
      
      
      {imagemParaCortar && (
        <div className="cropper-modal-overlay">
          <div className="cropper-modal-content">
            <h3>Ajuste sua imagem</h3>
            <div className="cropper-container">
              <Cropper
                image={imagemParaCortar}
                crop={crop}
                zoom={zoom}
                aspect={tipoCrop === 'avatarUrl' ? 1 : 16 / 5} 
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                cropShape={tipoCrop === 'avatarUrl' ? 'round' : 'rect'}
              />
            </div>
            <div className="cropper-controls">
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="zoom-slider"
              />
              <div className="cropper-actions">
                <button className="btn-cancelar" onClick={() => setImagemParaCortar(null)}>Cancelar</button>
                <button className="btn-salvar" onClick={handleUploadCortado} disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Aplicar e Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div 
        className="perfil-banner" 
        style={user.bannerUrl ? { backgroundImage: `url(${user.bannerUrl})` } : {}}
      >
        <div className="banner-overlay">
          <button 
            className="btn-editar-midia" 
            onClick={() => setEditandoMidia(!editandoMidia)}
            title="Alterar Foto e Banner"
          >
            ✎ Editar Capa
          </button>
        </div>
      </div>

      <div className="perfil-header">
        <div className="avatar-wrapper">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.nomeExibicao} className="perfil-avatar" referrerPolicy="no-referrer" />
          ) : (
            <div className="perfil-avatar avatar-vazio">
              <span>{(user.nomeExibicao || user.login || 'H')[0].toUpperCase()}</span>
            </div>
          )}
          <label className="avatar-upload-badge" title="Alterar foto de perfil">
            ✎
            <input type="file" accept="image/*" onChange={(e) => onFileChange(e, 'avatarUrl')} hidden />
          </label>
        </div>

        <div className="perfil-identidade">
          <span className="perfil-stat">Seguindo <strong>0</strong></span>
          <div className="perfil-nomes">
            {editandoIdentidade ? (
              <div className="identidade-editor-box">
                <input 
                  type="text" 
                  placeholder="Nome de Exibição" 
                  value={user.nomeExibicao} 
                  onChange={(e) => setUser({...user, nomeExibicao: e.target.value})} 
                  maxLength={30}
                />
                <div className="input-arroba">
                  <span>@</span>
                  <input 
                    type="text" 
                    placeholder="nomedeusuario" 
                    value={user.username} 
                 
                    onChange={(e) => setUser({...user, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})} 
                    maxLength={20}
                  />
                </div>
                <div className="editor-actions center-actions">
                  <button className="btn-salvar" onClick={() => salvarNoBanco({nomeExibicao: user.nomeExibicao, username: user.username})} disabled={salvando}>
                    Salvar
                  </button>
                  <button className="btn-cancelar" onClick={() => setEditandoIdentidade(false)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <h2>
                  {user.nomeExibicao || 'Novo Desenvolvedor'}
                  <button className="btn-edit-inline" onClick={() => setEditandoIdentidade(true)} title="Mudar Nome e @">
                    ✎
                  </button>
                </h2>
                <p>@{user.username || user.login.split('@')[0]}</p>
              </>
            )}
          </div>
          <span className="perfil-stat"><strong>0</strong> Seguidores</span>
        </div>

        
        {editandoMidia && (
          <div className="midia-editor-box">
            <h4>Atualizar Capa do Perfil</h4>
            
            <div className="midia-input-group">
              <label>Escolher nova imagem do computador:</label>
              <label className="custom-file-upload">
                <input type="file" accept="image/*" onChange={(e) => onFileChange(e, 'bannerUrl')} hidden />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                Fazer upload de arquivo
              </label>
            </div>

            <div className="midia-divisor"><span>OU USE UMA URL</span></div>

            <div className="midia-input-group">
              <input 
                type="text" 
                placeholder="Cole o link de uma imagem (ex: https://...)"
                value={user.bannerUrl}
                onChange={(e) => setUser({ ...user, bannerUrl: e.target.value })}
              />
            </div>
            
            <div className="editor-actions midia-actions">
              <button className="btn-cancelar" onClick={() => setEditandoMidia(false)}>Fechar</button>
              <button className="btn-salvar" onClick={() => salvarNoBanco({ bannerUrl: user.bannerUrl })} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar URL'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="perfil-content-grid">
        <div className="perfil-col-esquerda">
          <div className="perfil-top-cards">
            
            <div className="huby-card-wrapper">
              <div className="huby-card-header">
                <span className="huby-pill-tag">Biografia</span>
                <button className="huby-edit-btn" onClick={() => setEditandoBio(!editandoBio)} title="Editar Biografia">
                  ✎
                </button>
              </div>
              <div className="huby-card-body">
                {editandoBio ? (
                  <div className="card-editor">
                    <textarea
                      rows={4}
                      placeholder="Conte para a comunidade sobre você, seus jogos favoritos ou quais tecnologias você domina..."
                      value={user.bio}
                      onChange={(e) => setUser({ ...user, bio: e.target.value })}
                    />
                    <div className="editor-actions">
                      <button className="btn-salvar" onClick={() => salvarNoBanco({ bio: user.bio })} disabled={salvando}>
                        Salvar
                      </button>
                      <button className="btn-cancelar" onClick={() => setEditandoBio(false)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <p className={user.bio ? 'bio-text' : 'texto-vazio'}>
                    {user.bio || 'Sua biografia está vazia. Clique no ícone de lápis acima para adicionar uma descrição ao seu perfil.'}
                  </p>
                )}
              </div>
            </div>

            <div className="huby-card-wrapper">
              <div className="huby-card-header">
                <span className="huby-pill-tag">Informações Gerais</span>
                <button className="huby-edit-btn" onClick={() => setEditandoRedes(!editandoRedes)} title="Editar Redes Sociais">
                  ✎
                </button>
              </div>
              <div className="huby-card-body">
                {editandoRedes ? (
                  <div className="redes-editor-grid">
                    <input type="text" placeholder="Instagram" value={user.instagram} onChange={(e) => setUser({ ...user, instagram: e.target.value })} />
                    <input type="text" placeholder="Discord" value={user.discord} onChange={(e) => setUser({ ...user, discord: e.target.value })} />
                    <input type="text" placeholder="Twitter / X" value={user.twitter} onChange={(e) => setUser({ ...user, twitter: e.target.value })} />
                    <input type="text" placeholder="TikTok" value={user.tiktok} onChange={(e) => setUser({ ...user, tiktok: e.target.value })} />
                    <input type="text" placeholder="Steam" value={user.steam} onChange={(e) => setUser({ ...user, steam: e.target.value })} />
                    <input type="text" placeholder="Itch.io / Outro" value={user.itchIo} onChange={(e) => setUser({ ...user, itchIo: e.target.value })} />
                    <div className="editor-actions full-span">
                      <button className="btn-salvar" onClick={() => salvarNoBanco(user)} disabled={salvando}>Salvar</button>
                      <button className="btn-cancelar" onClick={() => setEditandoRedes(false)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="redes-grid">
                    <div className="rede-item">
                      <svg className="rede-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                      <span className={user.instagram ? '' : 'rede-vazia'}>{user.instagram || '...'}</span>
                    </div>
                    <div className="rede-item">
                      <svg className="rede-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      <span className={user.discord ? '' : 'rede-vazia'}>{user.discord || '...'}</span>
                    </div>
                    <div className="rede-item">
                      <svg className="rede-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>
                      <span className={user.twitter ? '' : 'rede-vazia'}>{user.twitter || '...'}</span>
                    </div>
                    <div className="rede-item">
                      <svg className="rede-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
                      <span className={user.tiktok ? '' : 'rede-vazia'}>{user.tiktok || '...'}</span>
                    </div>
                    <div className="rede-item">
                      <svg className="rede-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                      <span className={user.steam ? '' : 'rede-vazia'}>{user.steam || '...'}</span>
                    </div>
                    <div className="rede-item">
                      <svg className="rede-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4m-2-2v4m7-1h.01M18 11h.01"/></svg>
                      <span className={user.itchIo ? '' : 'rede-vazia'}>{user.itchIo || '...'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="perfil-bottom-cards">
            <div className="huby-card-wrapper">
              <div className="huby-card-header">
                <span className="huby-pill-tag">Comentários</span>
              </div>
              <div className="huby-card-body lista-interacoes">
                <div className="empty-state-box">
                  <p>Nenhum comentário realizado ainda.</p>
                  <span>Suas interações nas páginas de jogos e Game Jams aparecerão aqui.</span>
                </div>
              </div>
            </div>

            <div className="huby-card-wrapper">
              <div className="huby-card-header">
                <span className="huby-pill-tag">Avaliações</span>
              </div>
              <div className="huby-card-body lista-interacoes">
                <div className="empty-state-box">
                  <p>Nenhuma análise publicada.</p>
                  <span>Avalie os jogos indie da comunidade para construir seu histórico.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="perfil-col-direita">
          <div className="huby-card-wrapper full-height-card">
            <div className="huby-tabs-header">
              <button 
                className={`huby-tab-btn ${abaAtiva === 'publicados' ? 'ativa' : ''}`}
                onClick={() => setAbaAtiva('publicados')}
              >
                <svg className="tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4m-2-2v4m7-1h.01M18 11h.01"/></svg>
                Publicados <span>(0)</span>
              </button>
              <button 
                className={`huby-tab-btn ${abaAtiva === 'criados' ? 'ativa' : ''}`}
                onClick={() => setAbaAtiva('criados')}
              >
                <svg className="tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Criados <span>(0)</span>
              </button>
              <button 
                className={`huby-tab-btn ${abaAtiva === 'participados' ? 'ativa' : ''}`}
                onClick={() => setAbaAtiva('participados')}
              >
                <svg className="tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Participados <span>(0)</span>
              </button>
            </div>

            <div className="huby-card-body galeria-jogos-body">
              <div className="empty-publications">
                <h3>Nenhum projeto em "{abaAtiva}"</h3>
                <p>Quando você publicar seus jogos indie ou participar de Game Jams na plataforma, seus cartazes aparecerão em destaque nesta galeria.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Perfil;