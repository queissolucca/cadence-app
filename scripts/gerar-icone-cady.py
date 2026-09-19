#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Desenha o rosto da Cady como PNG, pro favicon da aba.

POR QUE UM SCRIPT, E NÃO UM ARQUIVO SOLTO

A Cady do app não é imagem: ela é desenhada em tempo real a partir das
constantes de lib/cady/cady.js (raio, posição dos olhos, da boca, das
bochechas) — é o que deixa ela piscar e mudar de expressão. Não existia PNG
dela pra copiar, e um PNG solto no repositório ficaria órfão: ninguém saberia
como foi feito nem como refazer em outro tamanho.

Este script é a origem. Rode de novo pra mudar tamanho ou expressão.

POR QUE ELE ESCREVE O PNG NA MÃO

Não há rsvg-convert, ImageMagick, Inkscape, cairosvg, Pillow nem sharp nesta
máquina. Em vez de pedir instalação de dependência pra gerar dois arquivos
estáticos, o PNG é montado com zlib + struct, que são da biblioteca padrão.

O DESENHO NÃO É UMA CÓPIA FIEL, E ISSO É DE PROPÓSITO

Uma aba mostra o ícone a 16x16. Três decisões saem disso:

  1. A esfera ocupa 96% do quadrado. No logo ela ocupa 60%, porque lá há o anel
     de raios verdes em volta. Margem, num favicon, é pixel jogado fora.
  2. O anel verde não entra. A 16px, risco fino vira ruído cinza em volta da
     bola — piora a leitura em vez de ajudar.
  3. Olhos e boca são ~30% maiores que a proporção do logo. Traço fino some
     primeiro; feição grande é o que sobrevive à redução.

Cores: paleta "rosa-quartzo" de lib/cady/cady.js, sem inventar tom novo.
"""
import zlib, struct, math

HI, MID, LO = (0xFF,0xE0,0xEA), (0xF5,0x8D,0xAE), (0xA6,0x3E,0x68)
INK, BLUSH, TONGUE = (0x1B,0x0A,0x12), (0xD9,0x52,0x7A), (0xEE,0x7D,0xA1)

def mistura(a, b, t):
    t = 0.0 if t < 0 else 1.0 if t > 1 else t
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))

def sobrepor(base, cor, alpha):
    return tuple(base[i] * (1 - alpha) + cor[i] * alpha for i in range(3))

def desenhar(lado, ss=4):
    """RGBA do ícone. `ss` = supersampling; a suavização sai da média."""
    W = lado * ss
    C = W / 2.0
    R = W * 0.48                      # a esfera preenche o quadrado
    # Luz vinda de cima à esquerda, como no logo.
    LX, LY = C - R * 0.42, C - R * 0.46

    # Feições, em fração do raio. Os nomes espelham lib/cady/cady.js.
    E_DX, E_DY = 0.285, -0.055        # centro de cada olho
    ARC_R, ARC_TH = 0.215, 0.078      # raio e grossura do arco do olho fechado
    M_DY, M_R = 0.255, 0.215          # boca: centro e raio do semicírculo
    B_DX, B_DY, B_RX, B_RY = 0.430, 0.115, 0.125, 0.075

    buf = bytearray(lado * lado * 4)
    for py in range(lado):
        for px in range(lado):
            sr = sg = sb = sa = 0.0
            for oy in range(ss):
                for ox in range(ss):
                    x, y = px * ss + ox + 0.5, py * ss + oy + 0.5
                    dx, dy = x - C, y - C
                    d = math.hypot(dx, dy)
                    if d > R + 1.0:
                        continue
                    # Borda da esfera suavizada pela distância ao raio.
                    a = 1.0 if d <= R - 1.0 else max(0.0, R + 1.0 - d) / 2.0

                    # Corpo: gradiente radial a partir do ponto de luz.
                    dl = math.hypot(x - LX, y - LY) / (R * 1.85)
                    cor = mistura(HI, MID, dl * 1.25) if dl < 0.8 else mistura(MID, LO, (dl - 0.8) / 0.55)
                    # Escurece na borda: é o que faz parecer esfera, não disco.
                    cor = mistura(cor, LO, max(0.0, (d / R - 0.62) / 0.38) ** 1.7 * 0.85)

                    # Brilho especular.
                    hx, hy = (x - (C - R * 0.34)) / (R * 0.33), (y - (C - R * 0.44)) / (R * 0.22)
                    h = hx * hx + hy * hy
                    if h < 1.0:
                        cor = sobrepor(cor, (255, 255, 255), (1.0 - h) ** 1.6 * 0.55)

                    # Bochechas.
                    for lado_b in (-1, 1):
                        bx = (dx - lado_b * B_DX * R) / (B_RX * R)
                        by = (dy - B_DY * R) / (B_RY * R)
                        b = bx * bx + by * by
                        if b < 1.0:
                            cor = sobrepor(cor, BLUSH, (1.0 - b) ** 0.9 * 0.62)

                    # Olhos fechados e felizes: só o TOPO do anel, formando ∩.
                    #
                    # `vy` é a altura em relação ao centro do círculo do arco.
                    # Sem o corte por vy, o anel fecha e vira um olho arregalado
                    # (O O) em vez de um olho sorrindo — foi o primeiro
                    # resultado deste script. O -0.30 recorta ~140 graus: o
                    # bastante pra ler como arco e não como parêntese.
                    for lado_o in (-1, 1):
                        ex = dx - lado_o * E_DX * R
                        vy = (dy - E_DY * R) + ARC_R * R * 0.42
                        if vy < -ARC_R * R * 0.30 and abs(math.hypot(ex, vy) - ARC_R * R) < ARC_TH * R / 2:
                            cor = sobrepor(cor, INK, 1.0)

                    # Boca: semicírculo com o lado reto pra cima.
                    my = dy - M_DY * R
                    dm = math.hypot(dx, my)
                    if dm < M_R * R and my > -M_R * R * 0.06:
                        cor = INK
                        # Língua, encostada na base da boca.
                        ty = my - M_R * R * 0.52
                        if math.hypot(dx, ty * 1.25) < M_R * R * 0.46:
                            cor = TONGUE

                    sr += cor[0] * a; sg += cor[1] * a; sb += cor[2] * a; sa += a
            n = ss * ss
            i = (py * lado + px) * 4
            if sa > 0:
                buf[i] = int(sr / sa + 0.5); buf[i+1] = int(sg / sa + 0.5); buf[i+2] = int(sb / sa + 0.5)
            buf[i+3] = int(sa / n * 255 + 0.5)
    return buf

def escrever_png(caminho, lado, rgba):
    linhas = b''.join(b'\x00' + bytes(rgba[y*lado*4:(y+1)*lado*4]) for y in range(lado))
    def bloco(tipo, dados):
        return struct.pack('>I', len(dados)) + tipo + dados + struct.pack('>I', zlib.crc32(tipo + dados) & 0xffffffff)
    png = (b'\x89PNG\r\n\x1a\n'
           + bloco(b'IHDR', struct.pack('>IIBBBBB', lado, lado, 8, 6, 0, 0, 0))
           + bloco(b'IDAT', zlib.compress(linhas, 9))
           + bloco(b'IEND', b''))
    open(caminho, 'wb').write(png)

if __name__ == '__main__':
    for caminho, lado in (('app/icon.png', 256), ('app/apple-icon.png', 180)):
        escrever_png(caminho, lado, desenhar(lado))
        print(f'{caminho}  {lado}x{lado}')
