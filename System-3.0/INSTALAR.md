# Instalar a versão 3.0

Leia [README.md](README.md) e o passo a passo em [docs/DEPLOY-CLOUDFLARE.md](docs/DEPLOY-CLOUDFLARE.md).

Extraia System-3.0 em uma nova pasta. Para manter seu D1 e sua URL, use o comando `npm run reuse -- "C:\Users\Mateus Monteiro\Downloads\fine-form\project\System-2.0"` do guia. Ele exporta um backup antes de copiar a configuração antiga.

Para uma instalação nova, crie o Worker `fine-form-3-0` e use `npm run configure`. Instalação nova tem banco vazio. Configure chave e autenticador antes de abrir o painel publicado.
