import { useEffect, useRef, useId } from 'react';
import gsap from 'gsap';

export interface AnimatedAvatarProps {
  focusedInput: 'email' | 'password' | null;
  emailValue?: string;
  showPassword?: boolean;
  isSubmitting?: boolean;
  isSuccess?: boolean;
  isError?: boolean;
  className?: string;
}

export function AnimatedAvatar({
  focusedInput,
  emailValue = '',
  showPassword = false,
  isSubmitting = false,
  isSuccess = false,
  isError = false,
  className = 'w-full h-full',
}: AnimatedAvatarProps) {
  const uniqueId = useId().replace(/:/g, '');
  const armMaskId = `armMask_${uniqueId}`;
  const armMaskPathId = `armMaskPath_${uniqueId}`;
  const mouthMaskId = `mouthMask_${uniqueId}`;
  const mouthMaskPathId = `mouthMaskPath_${uniqueId}`;

  // SVG Elements Refs
  const svgRef = useRef<SVGSVGElement>(null);
  const armLRef = useRef<SVGGElement>(null);
  const armRRef = useRef<SVGGElement>(null);
  const eyeLRef = useRef<SVGGElement>(null);
  const eyeRRef = useRef<SVGGElement>(null);
  const noseRef = useRef<SVGPathElement>(null);
  const mouthRef = useRef<SVGGElement>(null);
  const toothRef = useRef<SVGPathElement>(null);
  const tongueRef = useRef<SVGGElement>(null);
  const chinRef = useRef<SVGPathElement>(null);
  const faceRef = useRef<SVGPathElement>(null);
  const eyebrowRef = useRef<SVGGElement>(null);
  const hairRef = useRef<SVGPathElement>(null);
  const outerEarLRef = useRef<SVGGElement>(null);
  const outerEarRRef = useRef<SVGGElement>(null);
  const earHairLRef = useRef<SVGGElement>(null);
  const earHairRRef = useRef<SVGGElement>(null);

  // Garder une référence à l'état courant pour éviter les conflits d'animation
  const stateRef = useRef({ focusedInput, showPassword });

  // Position initiale des bras abaissés
  useEffect(() => {
    if (armLRef.current && armRRef.current) {
      gsap.set(armLRef.current, { x: -93, y: 220, rotation: 105, transformOrigin: 'top left' });
      gsap.set(armRRef.current, { x: -93, y: 220, rotation: -105, transformOrigin: 'top right' });
    }
    // Initialiser les yeux à scaleY: 1
    if (eyeLRef.current && eyeRRef.current) {
      gsap.set([eyeLRef.current, eyeRRef.current], { scaleY: 1, transformOrigin: 'center center' });
    }
  }, []);

  // ─── EFFET PRINCIPAL : Bras + Yeux (mot de passe) ───────────────────────────
  useEffect(() => {
    stateRef.current = { focusedInput, showPassword };

    if (!armLRef.current || !armRRef.current) return;

    // Tuer toutes les animations en cours sur les yeux pour éviter les conflits
    if (eyeLRef.current && eyeRRef.current) {
      gsap.killTweensOf([eyeLRef.current, eyeRRef.current]);
    }

    if (focusedInput === 'password') {
      if (showPassword) {
        // ── Mode Peek : mains légèrement écartées, yeux mi-ouverts ──
        gsap.to(armLRef.current, { duration: 0.45, x: -70, y: 40, rotation: 25, ease: 'power2.out' });
        gsap.to(armRRef.current, { duration: 0.45, x: -115, y: 40, rotation: -25, ease: 'power2.out', delay: 0.04 });
        if (eyeLRef.current && eyeRRef.current) {
          gsap.to([eyeLRef.current, eyeRRef.current], {
            duration: 0.35,
            x: 5,
            y: 2,
            scaleY: 0.4,
            transformOrigin: 'center center',
            ease: 'power2.out',
          });
        }
      } else {
        // ── Yeux fermés : bras couvrent complètement, pupils disparaissent ──
        gsap.to(armLRef.current, { duration: 0.40, x: -93, y: 2, rotation: 0, ease: 'power2.out' });
        gsap.to(armRRef.current, { duration: 0.40, x: -93, y: 2, rotation: 0, ease: 'power2.out', delay: 0.05 });
        if (eyeLRef.current && eyeRRef.current) {
          // Délai court pour que les bras commencent à monter avant que les yeux se ferment
          gsap.to([eyeLRef.current, eyeRRef.current], {
            duration: 0.30,
            delay: 0.08,
            scaleY: 0,
            x: 0,
            y: 0,
            transformOrigin: 'center center',
            ease: 'power2.inOut',
          });
        }
      }
    } else {
      // ── Bras baissés, yeux rouverts ──
      gsap.to(armLRef.current, { duration: 0.60, x: -93, y: 220, rotation: 105, ease: 'power2.out' });
      gsap.to(armRRef.current, { duration: 0.60, x: -93, y: 220, rotation: -105, ease: 'power2.out', delay: 0.05 });
      if (eyeLRef.current && eyeRRef.current) {
        gsap.to([eyeLRef.current, eyeRRef.current], {
          duration: 0.45,
          scaleY: 1,
          x: 0,
          y: 0,
          transformOrigin: 'center center',
          ease: 'back.out(1.8)',
          delay: 0.20, // Attendre que les bras descendent avant de rouvrir les yeux
        });
      }
    }
  }, [focusedInput, showPassword]);

  // ─── SUIVI DU REGARD (email) ─────────────────────────────────────────────────
  useEffect(() => {
    if (focusedInput === 'email') {
      const len = emailValue.length;
      const ratio = Math.min(1, Math.max(0, len / 28));
      const dX = (ratio - 0.5) * 2;

      const eyeMaxHorizD = 18;
      const noseMaxHorizD = 16;

      const eyeX = dX * eyeMaxHorizD;
      const eyeY = 6;
      const noseX = dX * noseMaxHorizD;
      const noseY = 4;
      const mouthX = dX * 12;
      const mouthY = 3;
      const mouthR = dX * 6;
      const faceX = dX * 6;
      const faceY = 2;
      const chinX = dX * 4;
      const hairX = dX * 5;

      // Tuer les animations yeux potentiellement en cours
      if (eyeLRef.current && eyeRRef.current) gsap.killTweensOf([eyeLRef.current, eyeRRef.current]);

      if (eyeLRef.current) gsap.to(eyeLRef.current, { duration: 0.25, x: eyeX, y: eyeY, scaleY: 1, transformOrigin: 'center center', ease: 'power2.out' });
      if (eyeRRef.current) gsap.to(eyeRRef.current, { duration: 0.25, x: eyeX, y: eyeY, scaleY: 1, transformOrigin: 'center center', ease: 'power2.out' });
      if (noseRef.current) gsap.to(noseRef.current, { duration: 0.25, x: noseX, y: noseY, rotation: mouthR, transformOrigin: 'center center', ease: 'power2.out' });
      if (mouthRef.current) gsap.to(mouthRef.current, { duration: 0.25, x: mouthX, y: mouthY, rotation: mouthR, transformOrigin: 'center center', ease: 'power2.out' });
      if (chinRef.current) gsap.to(chinRef.current, { duration: 0.25, x: chinX, y: 2, ease: 'power2.out' });
      if (faceRef.current) gsap.to(faceRef.current, { duration: 0.25, x: faceX, y: faceY, ease: 'power2.out' });
      if (eyebrowRef.current) gsap.to(eyebrowRef.current, { duration: 0.25, x: faceX, y: faceY, ease: 'power2.out' });
      if (hairRef.current) gsap.to(hairRef.current, { duration: 0.25, x: hairX, ease: 'power2.out' });

      if (emailValue.includes('@')) {
        if (tongueRef.current) gsap.to(tongueRef.current, { duration: 0.25, y: 3, ease: 'power2.out' });
        if (toothRef.current) gsap.to(toothRef.current, { duration: 0.25, x: 2, y: -1, ease: 'power2.out' });
      } else {
        if (tongueRef.current) gsap.to(tongueRef.current, { duration: 0.25, y: 0, ease: 'power2.out' });
        if (toothRef.current) gsap.to(toothRef.current, { duration: 0.25, x: 0, y: 0, ease: 'power2.out' });
      }
    } else if (focusedInput === null && !isSuccess && !isError) {
      // Remise au neutre — ATTENTION : ne pas toucher scaleY si on est en mode password
      const nonEyeElements = [
        noseRef.current,
        mouthRef.current,
        chinRef.current,
        faceRef.current,
        eyebrowRef.current,
        hairRef.current,
        outerEarLRef.current,
        outerEarRRef.current,
        earHairLRef.current,
        earHairRRef.current,
        tongueRef.current,
        toothRef.current,
      ].filter(Boolean);

      gsap.to(nonEyeElements, {
        duration: 0.5,
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        skewX: 0,
        ease: 'power2.out',
      });

      // Les yeux ont leur propre remise au neutre dans l'effet bras/password (ci-dessus)
      // On ne les touche ici QUE si on n'est pas en mode password
      if (stateRef.current.focusedInput !== 'password') {
        if (eyeLRef.current && eyeRRef.current) {
          gsap.killTweensOf([eyeLRef.current, eyeRRef.current]);
          gsap.to([eyeLRef.current, eyeRRef.current], {
            duration: 0.5,
            x: 0,
            y: 0,
            scaleY: 1,
            transformOrigin: 'center center',
            ease: 'power2.out',
          });
        }
      }
    }
  }, [focusedInput, emailValue, isSuccess, isError]);

  // ─── SUCCÈS ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isSuccess) {
      if (eyeLRef.current && eyeRRef.current) {
        gsap.killTweensOf([eyeLRef.current, eyeRRef.current]);
        gsap.to([eyeLRef.current, eyeRRef.current], { duration: 0.3, y: -4, scaleY: 0.7, transformOrigin: 'center center', ease: 'power2.out' });
      }
      if (mouthRef.current) {
        gsap.to(mouthRef.current, { duration: 0.3, y: -3, scaleX: 1.2, transformOrigin: 'center center', ease: 'back.out(2)' });
      }
      if (tongueRef.current) {
        gsap.to(tongueRef.current, { duration: 0.3, y: 3, ease: 'power2.out' });
      }
    }
  }, [isSuccess]);

  // ─── ERREUR (secousse) ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isError && svgRef.current) {
      gsap.fromTo(
        svgRef.current,
        { x: -8 },
        { x: 8, duration: 0.08, repeat: 5, yoyo: true, ease: 'power1.inOut', onComplete: () => {
          gsap.to(svgRef.current, { x: 0, duration: 0.1 });
        }}
      );
      if (eyebrowRef.current) {
        gsap.to(eyebrowRef.current, { duration: 0.2, y: 4, ease: 'power2.out' });
      }
    }
  }, [isError]);

  // ─── CHARGEMENT ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isSubmitting && eyeLRef.current && eyeRRef.current) {
      gsap.to([eyeLRef.current, eyeRRef.current], {
        duration: 0.4,
        y: -4,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut'
      });
    }
  }, [isSubmitting]);

  return (
    <div className={className}>
      <svg
        ref={svgRef}
        className="w-full h-full select-none"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        viewBox="0 0 200 200"
      >
        <defs>
          <circle id={armMaskPathId} cx="100" cy="100" r="100" />
          <clipPath id={armMaskId}>
            <circle cx="100" cy="100" r="100" />
          </clipPath>
          <clipPath id={mouthMaskId}>
            <path
              id={mouthMaskPathId}
              d="M100.2,101c-0.4,0-1.4,0-1.8,0c-2.7-0.3-5.3-1.1-8-2.5c-0.7-0.3-0.9-1.2-0.6-1.8 c0.2-0.5,0.7-0.7,1.2-0.7c0.2,0,0.5,0.1,0.6,0.2c3,1.5,5.8,2.3,8.6,2.3s5.7-0.7,8.6-2.3c0.2-0.1,0.4-0.2,0.6-0.2 c0.5,0,1,0.3,1.2,0.7c0.4,0.7,0.1,1.5-0.6,1.9c-2.6,1.4-5.3,2.2-7.9,2.5C101.7,101,100.5,101,100.2,101z"
            />
          </clipPath>
        </defs>

        {/* Fond circulaire coloré cyan / teal Al Shifa */}
        <circle cx="100" cy="100" r="100" fill="#a9ddf3" />

        {/* Corps / Vêtement blanc médical */}
        <g className="body">
          <path
            fill="#FFFFFF"
            d="M193.3,135.9c-5.8-8.4-15.5-13.9-26.5-13.9H151V72c0-27.6-22.4-50-50-50S51,44.4,51,72v50H32.1 c-10.6,0-20,5.1-25.8,13l0,78h187L193.3,135.9z"
          />
          <path
            fill="none"
            stroke="#3A5E77"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M193.3,135.9 c-5.8-8.4-15.5-13.9-26.5-13.9H151V72c0-27.6-22.4-50-50-50S51,44.4,51,72v50H32.1c-10.6,0-20,5.1-25.8,13"
          />
          <path
            fill="#DDF1FA"
            d="M100,156.4c-22.9,0-43,11.1-54.1,27.7c15.6,10,34.2,15.9,54.1,15.9s38.5-5.8,54.1-15.9 C143,167.5,122.9,156.4,100,156.4z"
          />
        </g>

        {/* Oreille Gauche */}
        <g className="earL">
          <g ref={outerEarLRef} className="outerEar" fill="#ddf1fa" stroke="#3a5e77" strokeWidth="2.5">
            <circle cx="47" cy="83" r="11.5" />
            <path d="M46.3 78.9c-2.3 0-4.1 1.9-4.1 4.1 0 2.3 1.9 4.1 4.1 4.1" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <g ref={earHairLRef} className="earHair">
            <rect x="51" y="64" fill="#FFFFFF" width="15" height="35" />
            <path
              d="M53.4 62.8C48.5 67.4 45 72.2 42.8 77c3.4-.1 6.8-.1 10.1.1-4 3.7-6.8 7.6-8.2 11.6 2.1 0 4.2 0 6.3.2-2.6 4.1-3.8 8.3-3.7 12.5 1.2-.7 3.4-1.4 5.2-1.9"
              fill="#fff"
              stroke="#3a5e77"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </g>

        {/* Oreille Droite */}
        <g className="earR">
          <g ref={outerEarRRef} className="outerEar" fill="#ddf1fa" stroke="#3a5e77" strokeWidth="2.5">
            <circle cx="155" cy="83" r="11.5" />
            <path d="M155.7 78.9c2.3 0 4.1 1.9 4.1 4.1 0 2.3-1.9 4.1-4.1 4.1" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <g ref={earHairRRef} className="earHair">
            <rect x="131" y="64" fill="#FFFFFF" width="20" height="35" />
            <path
              d="M148.6 62.8c4.9 4.6 8.4 9.4 10.6 14.2-3.4-.1-6.8-.1-10.1.1 4 3.7 6.8 7.6 8.2 11.6-2.1 0-4.2 0-6.3.2 2.6 4.1 3.8 8.3 3.7 12.5-1.2-.7-3.4-1.4-5.2-1.9"
              fill="#fff"
              stroke="#3a5e77"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </g>

        {/* Menton */}
        <path
          ref={chinRef}
          className="chin"
          d="M84.1 121.6c2.7 2.9 6.1 5.4 9.8 7.5l.9-4.5c2.9 2.5 6.3 4.8 10.2 6.5 0-1.9-.1-3.9-.2-5.8 3 1.2 6.2 2 9.7 2.5-.3-2.1-.7-4.1-1.2-6.1"
          fill="none"
          stroke="#3a5e77"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Visage */}
        <path
          ref={faceRef}
          className="face"
          fill="#DDF1FA"
          d="M134.5,46v35.5c0,21.815-15.446,39.5-34.5,39.5s-34.5-17.685-34.5-39.5V46"
        />

        {/* Cheveux */}
        <path
          ref={hairRef}
          className="hair"
          fill="#FFFFFF"
          stroke="#3A5E77"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M81.457,27.929 c1.755-4.084,5.51-8.262,11.253-11.77c0.979,2.565,1.883,5.14,2.712,7.723c3.162-4.265,8.626-8.27,16.272-11.235 c-0.737,3.293-1.588,6.573-2.554,9.837c4.857-2.116,11.049-3.64,18.428-4.156c-2.403,3.23-5.021,6.391-7.852,9.474"
        />

        {/* Sourcils */}
        <g ref={eyebrowRef} className="eyebrow">
          <path
            fill="#FFFFFF"
            d="M138.142,55.064c-4.93,1.259-9.874,2.118-14.787,2.599c-0.336,3.341-0.776,6.689-1.322,10.037 c-4.569-1.465-8.909-3.222-12.996-5.226c-0.98,3.075-2.07,6.137-3.267,9.179c-5.514-3.067-10.559-6.545-15.097-10.329 c-1.806,2.889-3.745,5.73-5.816,8.515c-7.916-4.124-15.053-9.114-21.296-14.738l1.107-11.768h73.475V55.064z"
          />
          <path
            fill="#FFFFFF"
            stroke="#3A5E77"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M63.56,55.102 c6.243,5.624,13.38,10.614,21.296,14.738c2.071-2.785,4.01-5.626,5.816-8.515c4.537,3.785,9.583,7.263,15.097,10.329 c1.197-3.043,2.287-6.104,3.267-9.179c4.087,2.004,8.427,3.761,12.996,5.226c0.545-3.348,0.986-6.696,1.322-10.037 c4.913-0.481,9.857-1.34,14.787-2.599"
          />
        </g>

        {/* Œil Gauche */}
        <g ref={eyeLRef} className="eyeL">
          <circle cx="85.5" cy="78.5" r="3.5" fill="#3a5e77" />
          <circle cx="84" cy="76" r="1" fill="#fff" />
        </g>

        {/* Œil Droit */}
        <g ref={eyeRRef} className="eyeR">
          <circle cx="114.5" cy="78.5" r="3.5" fill="#3a5e77" />
          <circle cx="113" cy="76" r="1" fill="#fff" />
        </g>

        {/* Bouche interactive */}
        <g ref={mouthRef} className="mouth">
          <path
            className="mouthBG"
            fill="#617E92"
            d="M100.2,101c-0.4,0-1.4,0-1.8,0c-2.7-0.3-5.3-1.1-8-2.5c-0.7-0.3-0.9-1.2-0.6-1.8 c0.2-0.5,0.7-0.7,1.2-0.7c0.2,0,0.5,0.1,0.6,0.2c3,1.5,5.8,2.3,8.6,2.3s5.7-0.7,8.6-2.3c0.2-0.1,0.4-0.2,0.6-0.2 c0.5,0,1,0.3,1.2,0.7c0.4,0.7,0.1,1.5-0.6,1.9c-2.6,1.4-5.3,2.2-7.9,2.5C101.7,101,100.5,101,100.2,101z"
          />
          <g clipPath={`url(#${mouthMaskId})`}>
            <g ref={tongueRef} className="tongue">
              <circle cx="100" cy="107" r="8" fill="#cc4a6c" />
              <ellipse className="tongueHighlight" cx="100" cy="100.5" rx="3" ry="1.5" opacity=".1" fill="#fff" />
            </g>
          </g>
          <path
            ref={toothRef}
            clipPath={`url(#${mouthMaskId})`}
            className="tooth"
            fill="#FFFFFF"
            d="M106,97h-4c-1.1,0-2-0.9-2-2v-2h8v2C108,96.1,107.1,97,106,97z"
          />
          <path
            className="mouthOutline"
            fill="none"
            stroke="#3A5E77"
            strokeWidth="2.5"
            strokeLinejoin="round"
            d="M100.2,101c-0.4,0-1.4,0-1.8,0c-2.7-0.3-5.3-1.1-8-2.5c-0.7-0.3-0.9-1.2-0.6-1.8 c0.2-0.5,0.7-0.7,1.2-0.7c0.2,0,0.5,0.1,0.6,0.2c3,1.5,5.8,2.3,8.6,2.3s5.7-0.7,8.6-2.3c0.2-0.1,0.4-0.2,0.6-0.2 c0.5,0,1,0.3,1.2,0.7c0.4,0.7,0.1,1.5-0.6,1.9c-2.6,1.4-5.3,2.2-7.9,2.5C101.7,101,100.5,101,100.2,101z"
          />
        </g>

        {/* Nez */}
        <path
          ref={noseRef}
          className="nose"
          d="M97.7 79.9h4.7c1.9 0 3 2.2 1.9 3.7l-2.3 3.3c-.9 1.3-2.9 1.3-3.8 0l-2.3-3.3c-1.3-1.6-.2-3.7 1.8-3.7z"
          fill="#3a5e77"
        />

        {/* Bras animés qui couvrent les yeux */}
        <g className="arms" clipPath={`url(#${armMaskId})`}>
          {/* Bras Gauche */}
          <g ref={armLRef} className="armL">
            <path
              fill="#ddf1fa"
              stroke="#3a5e77"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeMiterlimit="10"
              strokeWidth="2.5"
              d="M121.3 97.4L111 58.7l38.8-10.4 20 36.1z"
            />
            <path
              fill="#ddf1fa"
              stroke="#3a5e77"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeMiterlimit="10"
              strokeWidth="2.5"
              d="M134.4 52.5l19.3-5.2c2.7-.7 5.4.9 6.1 3.5.7 2.7-.9 5.4-3.5 6.1L146 59.7M160.8 76.5l19.4-5.2c2.7-.7 5.4.9 6.1 3.5.7 2.7-.9 5.4-3.5 6.1l-18.3 4.9M158.3 66.8l23.1-6.2c2.7-.7 5.4.9 6.1 3.5.7 2.7-.9 5.4-3.5 6.1l-23.1 6.2M150.9 58.4l26-7c2.7-.7 5.4.9 6.1 3.5.7 2.7-.9 5.4-3.5 6.1l-21.3 5.7"
            />
            <path fill="#a9ddf3" d="M178.8 74.7l2.2-.6c1.1-.3 2.2.3 2.4 1.4.3 1.1-.3 2.2-1.4 2.4l-2.2.6-1-3.8zM180.1 64l2.2-.6c1.1-.3 2.2.3 2.4 1.4.3 1.1-.3 2.2-1.4 2.4l-2.2.6-1-3.8zM175.5 54.9l2.2-.6c1.1-.3 2.2.3 2.4 1.4.3 1.1-.3 2.2-1.4 2.4l-2.2.6-1-3.8zM152.1 49.4l2.2-.6c1.1-.3 2.2.3 2.4 1.4.3 1.1-.3 2.2-1.4 2.4l-2.2.6-1-3.8z" />
            <path
              fill="#fff"
              stroke="#3a5e77"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M123.5 96.8c-41.4 14.9-84.1 30.7-108.2 35.5L1.2 80c33.5-9.9 71.9-16.5 111.9-21.8"
            />
            <path
              fill="#fff"
              stroke="#3a5e77"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M108.5 59.4c7.7-5.3 14.3-8.4 22.8-13.2-2.4 5.3-4.7 10.3-6.7 15.1 4.3.3 8.4.7 12.3 1.3-4.2 5-8.1 9.6-11.5 13.9 3.1 1.1 6 2.4 8.7 3.8-1.4 2.9-2.7 5.8-3.9 8.5 2.5 3.5 4.6 7.2 6.3 11-4.9-.8-9-.7-16.2-2.7M94.5 102.8c-.6 4-3.8 8.9-9.4 14.7-2.6-1.8-5-3.7-7.2-5.7-2.5 4.1-6.6 8.8-12.2 14-1.9-2.2-3.4-4.5-4.5-6.9-4.4 3.3-9.5 6.9-15.4 10.8-.2-3.4.1-7.1 1.1-10.9M97.5 62.9c-1.7-2.4-5.9-4.1-12.4-5.2-.9 2.2-1.8 4.3-2.5 6.5-3.8-1.8-9.4-3.1-17-3.8.5 2.3 1.2 4.5 1.9 6.8-5-.6-11.2-.9-18.4-1 2 2.9.9 3.5 3.9 6.2"
            />
          </g>

          {/* Bras Droit */}
          <g ref={armRRef} className="armR">
            <path
              fill="#ddf1fa"
              stroke="#3a5e77"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeMiterlimit="10"
              strokeWidth="2.5"
              d="M265.4 97.3l10.4-38.6-38.9-10.5-20 36.1z"
            />
            <path
              fill="#ddf1fa"
              stroke="#3a5e77"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeMiterlimit="10"
              strokeWidth="2.5"
              d="M252.4 52.4L233 47.2c-2.7-.7-5.4.9-6.1 3.5-.7 2.7.9 5.4 3.5 6.1l10.3 2.8M226 76.4l-19.4-5.2c-2.7-.7-5.4.9-6.1 3.5-.7 2.7.9 5.4 3.5 6.1l18.3 4.9M228.4 66.7l-23.1-6.2c-2.7-.7-5.4.9-6.1 3.5-.7 2.7.9 5.4 3.5 6.1l23.1 6.2M235.8 58.3l-26-7c-2.7-.7-5.4.9-6.1 3.5-.7 2.7.9 5.4 3.5 6.1l21.3 5.7"
            />
            <path fill="#a9ddf3" d="M207.9 74.7l-2.2-.6c-1.1-.3-2.2.3-2.4 1.4-.3 1.1.3 2.2 1.4 2.4l2.2.6 1-3.8zM206.7 64l-2.2-.6c-1.1-.3-2.2.3-2.4 1.4-.3 1.1.3 2.2 1.4 2.4l2.2.6 1-3.8zM211.2 54.8l-2.2-.6c-1.1-.3-2.2.3-2.4 1.4-.3 1.1.3 2.2 1.4 2.4l2.2.6 1-3.8zM234.6 49.4l-2.2-.6c-1.1-.3-2.2.3-2.4 1.4-.3 1.1.3 2.2 1.4 2.4l2.2.6 1-3.8z" />
            <path
              fill="#fff"
              stroke="#3a5e77"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M263.3 96.7c41.4 14.9 84.1 30.7 108.2 35.5l14-52.3C352 70 313.6 63.5 273.6 58.1"
            />
            <path
              fill="#fff"
              stroke="#3a5e77"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M278.2 59.3l-18.6-10 2.5 11.9-10.7 6.5 9.9 8.7-13.9 6.4 9.1 5.9-13.2 9.2 23.1-.9M284.5 100.1c-.4 4 1.8 8.9 6.7 14.8 3.5-1.8 6.7-3.6 9.7-5.5 1.8 4.2 5.1 8.9 10.1 14.1 2.7-2.1 5.1-4.4 7.1-6.8 4.1 3.4 9 7 14.7 11 1.2-3.4 1.8-7 1.7-10.9M314 66.7s5.4-5.7 12.6-7.4c1.7 2.9 3.3 5.7 4.9 8.6 3.8-2.5 9.8-4.4 18.2-5.7.1 3.1.1 6.1 0 9.2 5.5-1 12.5-1.6 20.8-1.9-1.4 3.9-2.5 8.4-2.5 8.4"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
