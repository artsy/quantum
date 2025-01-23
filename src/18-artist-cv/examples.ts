/**
 * See: https://docs.anthropic.com/en/docs/build-with-claude/vision#evaluate-image-size
 */

export const examples = {
  dancy: {
    pdf: "examples/dancy/dancy-cv.pdf",
    images: {
      regular: [
        "examples/dancy/dancy-cv-1-smaller.jpg",
        "examples/dancy/dancy-cv-2-smaller.jpg",
        "examples/dancy/dancy-cv-3-smaller.jpg",
      ],
      smaller: [
        "examples/dancy/dancy-cv-1-smallerer.jpg",
        "examples/dancy/dancy-cv-2-smallerer.jpg",
        "examples/dancy/dancy-cv-3-smallerer.jpg",
      ],
    },
  },
  herrera: {
    pdf: "examples/herrera/Carmen_Herrera_CV.pdf",
    images: {
      regular: [
        "examples/herrera/Carmen_Herrera_CV-1.jpg",
        "examples/herrera/Carmen_Herrera_CV-2.jpg",
        "examples/herrera/Carmen_Herrera_CV-3.jpg",
        "examples/herrera/Carmen_Herrera_CV-4.jpg",
        "examples/herrera/Carmen_Herrera_CV-5.jpg",
        "examples/herrera/Carmen_Herrera_CV-6.jpg",
      ],
      smaller: [
        "examples/herrera/Carmen_Herrera_CV-1-smaller.jpg",
        "examples/herrera/Carmen_Herrera_CV-2-smaller.jpg",
        "examples/herrera/Carmen_Herrera_CV-3-smaller.jpg",
        "examples/herrera/Carmen_Herrera_CV-4-smaller.jpg",
        "examples/herrera/Carmen_Herrera_CV-5-smaller.jpg",
        "examples/herrera/Carmen_Herrera_CV-6-smaller.jpg",
      ],
    },
  },
  hoque: {
    pdf: "examples/hoque/Asif-Hoque-2020-CV.pdf",
    images: {
      regular: ["examples/hoque/Asif-Hoque-2020-CV.jpg"],
      smaller: ["examples/hoque/Asif-Hoque-2020-CV-smaller.jpg"],
    },
  },
}

export const current = examples.hoque
