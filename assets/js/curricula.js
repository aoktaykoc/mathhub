'use strict';
/* ============================================================
   Curriculum library: curriculum → units → topics → learning outcomes.
   "Tracks" mark levels inside one curriculum (Standard/Extended, SL/HL).
   An item with no tracks belongs to every track; ["HL"] means HL only.
   DP content summarises the IB Mathematics guide (first assessment 2021);
   outcome wording is paraphrased — check your copy of the guide.
   ============================================================ */

// [title, {SL, HL} teaching hours, [[code, title, [outcomes…]], …]]
const AA_UNITS = [
  ['Topic 1 — Number and algebra', { SL: 19, HL: 39 }, [
    ['SL 1.1', 'Scientific notation', ['Write and calculate with numbers in the form a × 10ᵏ, where 1 ≤ a < 10 and k ∈ ℤ']],
    ['SL 1.2', 'Arithmetic sequences and series', ['Use the formulae for the nth term and the sum of the first n terms of an arithmetic sequence', 'Use sigma notation for sums of arithmetic sequences', 'Apply arithmetic sequences and series in real-life contexts']],
    ['SL 1.3', 'Geometric sequences and series', ['Use the formulae for the nth term and the sum of the first n terms of a geometric sequence', 'Use sigma notation for sums of geometric sequences', 'Apply geometric sequences and series in real-life contexts']],
    ['SL 1.4', 'Financial applications', ['Solve compound interest and annual depreciation problems', 'Use technology for financial calculations']],
    ['SL 1.5', 'Exponents and logarithms (introduction)', ['Apply the laws of exponents with integer exponents', 'Understand logarithms as the inverse of exponentials, with base 10 and base e', 'Evaluate logarithms numerically using technology']],
    ['SL 1.6', 'Simple deductive proof', ['Construct simple deductive proofs, working from LHS to RHS', 'Use the notation of identity (≡) correctly']],
    ['SL 1.7', 'Laws of exponents and logarithms', ['Apply the laws of exponents with rational exponents', 'Apply the laws of logarithms, including change of base', 'Solve exponential equations, including by using logarithms']],
    ['SL 1.8', 'Infinite geometric series', ['Find the sum of an infinite convergent geometric sequence', 'Use the condition |r| < 1 for convergence']],
    ['SL 1.9', 'The binomial theorem', ['Expand (a + b)ⁿ for n ∈ ℕ', 'Use Pascal’s triangle and ⁿCᵣ to find coefficients']],
    ['AHL 1.10', 'Counting principles', ['Use the counting principle, permutations and combinations', 'Extend the binomial theorem to fractional and negative indices']],
    ['AHL 1.11', 'Partial fractions', ['Decompose rational expressions into partial fractions']],
    ['AHL 1.12', 'Complex numbers', ['Use the Cartesian form z = a + bi', 'Perform the four operations with complex numbers', 'Represent complex numbers on an Argand diagram']],
    ['AHL 1.13', 'Polar and Euler form', ['Convert between Cartesian, modulus–argument (polar) and Euler forms', 'Multiply and divide in polar and Euler form and interpret the results geometrically']],
    ['AHL 1.14', 'Complex roots and De Moivre’s theorem', ['Use the conjugate root theorem for polynomials with real coefficients', 'Use De Moivre’s theorem to find powers and roots of complex numbers']],
    ['AHL 1.15', 'Proof', ['Prove statements by mathematical induction', 'Prove statements by contradiction', 'Disprove statements using a counterexample']],
    ['AHL 1.16', 'Systems of linear equations', ['Solve systems of up to three linear equations in three unknowns', 'Interpret systems with a unique solution, infinitely many solutions or no solution']],
  ]],
  ['Topic 2 — Functions', { SL: 21, HL: 32 }, [
    ['SL 2.1', 'Equations of straight lines', ['Use the forms y = mx + c, ax + by + d = 0 and y − y₁ = m(x − x₁)', 'Find gradients and intercepts', 'Use the gradients of parallel and perpendicular lines']],
    ['SL 2.2', 'Functions', ['Understand function, domain, range and graph', 'Use function notation', 'Understand the inverse function as a reflection in the line y = x']],
    ['SL 2.3', 'Graphs of functions', ['Sketch and draw graphs of functions by hand and with technology']],
    ['SL 2.4', 'Key features of graphs', ['Determine maxima, minima, intercepts, symmetry, vertex, zeros and asymptotes', 'Find points of intersection of two curves using technology']],
    ['SL 2.5', 'Composite and inverse functions', ['Form composite functions (f ∘ g)(x)', 'Find inverse functions f⁻¹(x)', 'Understand the identity function']],
    ['SL 2.6', 'Quadratic functions', ['Use the forms ax² + bx + c, a(x − p)(x − q) and a(x − h)² + k', 'Identify the vertex, intercepts and axis of symmetry']],
    ['SL 2.7', 'Quadratic equations and inequalities', ['Solve quadratic equations and inequalities by factorising, completing the square and the formula', 'Use the discriminant to determine the nature of the roots']],
    ['SL 2.8', 'Rational functions', ['Sketch the reciprocal function and recognise it as self-inverse', 'Sketch rational functions of the form (ax + b)/(cx + d) and find their asymptotes']],
    ['SL 2.9', 'Exponential and logarithmic functions', ['Sketch exponential functions aˣ and eˣ and logarithmic functions', 'Recognise ln x and eˣ as inverse functions']],
    ['SL 2.10', 'Solving equations', ['Solve equations analytically', 'Solve equations graphically and with technology', 'Apply equation solving in real-life contexts']],
    ['SL 2.11', 'Transformations of graphs', ['Apply translations, reflections and stretches to graphs', 'Apply composite transformations']],
    ['AHL 2.12', 'Polynomial functions', ['Use the factor and remainder theorems', 'Use sums and products of the roots of polynomial equations', 'Sketch graphs of polynomial functions']],
    ['AHL 2.13', 'Further rational functions', ['Sketch rational functions with a quadratic numerator or denominator, including oblique asymptotes']],
    ['AHL 2.14', 'Odd, even and inverse functions', ['Identify odd and even functions', 'Find inverses on restricted domains and recognise self-inverse functions']],
    ['AHL 2.15', 'Inequalities', ['Solve inequalities g(x) ≥ f(x) graphically and analytically']],
    ['AHL 2.16', 'Modulus and reciprocal graphs', ['Sketch y = |f(x)|, y = f(|x|), y = 1/f(x), y = f(ax + b) and y = [f(x)]²', 'Solve modulus equations and inequalities']],
  ]],
  ['Topic 3 — Geometry and trigonometry', { SL: 25, HL: 51 }, [
    ['SL 3.1', 'Three-dimensional geometry', ['Find distances and midpoints in three dimensions', 'Calculate volumes and surface areas of 3D solids and combinations of solids', 'Find the angle between two intersecting lines or between a line and a plane']],
    ['SL 3.2', 'Triangle trigonometry', ['Use sine, cosine and tangent in right-angled triangles', 'Use the sine rule and cosine rule', 'Find the area of a triangle using ½ab sin C']],
    ['SL 3.3', 'Applications of trigonometry', ['Solve problems involving angles of elevation and depression and bearings', 'Construct labelled diagrams from written statements']],
    ['SL 3.4', 'The circle and radians', ['Use radian measure', 'Find arc length and sector area']],
    ['SL 3.5', 'The unit circle', ['Define sin θ and cos θ using the unit circle, and tan θ = sin θ / cos θ', 'Recall exact values of trigonometric ratios', 'Recognise the ambiguous case of the sine rule']],
    ['SL 3.6', 'Trigonometric identities', ['Use the Pythagorean identity cos²θ + sin²θ = 1', 'Use double-angle identities for sine and cosine']],
    ['SL 3.7', 'Circular functions', ['Sketch sin, cos and tan graphs and identify amplitude and period', 'Apply transformations to circular functions', 'Model real-life situations with circular functions']],
    ['SL 3.8', 'Trigonometric equations', ['Solve trigonometric equations in a finite interval, graphically and analytically', 'Solve equations that lead to quadratics in sin, cos or tan']],
    ['AHL 3.9', 'Reciprocal and inverse trigonometric functions', ['Use sec, cosec and cot and the related Pythagorean identities', 'Use arcsin, arccos and arctan, including their domains and ranges']],
    ['AHL 3.10', 'Compound angle identities', ['Use compound angle identities', 'Use the double-angle identity for tan']],
    ['AHL 3.11', 'Symmetry of trigonometric graphs', ['Use relationships between trigonometric functions and the symmetry properties of their graphs']],
    ['AHL 3.12', 'Vectors', ['Represent vectors algebraically and geometrically', 'Use position vectors, unit vectors, magnitude and base vectors i, j, k']],
    ['AHL 3.13', 'Scalar product', ['Calculate the scalar product and the angle between two vectors', 'Use the conditions for perpendicular and parallel vectors']],
    ['AHL 3.14', 'Vector equations of lines', ['Write vector, parametric and Cartesian equations of lines in 2D and 3D', 'Find the angle between two lines', 'Apply to simple kinematics']],
    ['AHL 3.15', 'Relationships between lines', ['Classify lines as coincident, parallel, intersecting or skew', 'Find points of intersection']],
    ['AHL 3.16', 'Vector product', ['Calculate the vector product and use its properties', 'Find areas of parallelograms and triangles']],
    ['AHL 3.17', 'Planes', ['Write vector and Cartesian equations of a plane']],
    ['AHL 3.18', 'Intersections and angles', ['Find intersections of a line and a plane, two planes and three planes', 'Find the angle between a line and a plane and between two planes']],
  ]],
  ['Topic 4 — Statistics and probability', { SL: 27, HL: 33 }, [
    ['SL 4.1', 'Collecting data', ['Distinguish population and sample, and discrete and continuous data', 'Identify bias and reliability issues', 'Describe sampling techniques and their effectiveness']],
    ['SL 4.2', 'Presenting data', ['Construct and interpret frequency tables, histograms and cumulative frequency graphs', 'Construct box-and-whisker plots and identify outliers']],
    ['SL 4.3', 'Measures of central tendency and dispersion', ['Calculate mean, median, mode, quartiles, range, IQR, standard deviation and variance', 'Describe the effect of constant changes to data', 'Estimate statistics for grouped data using technology']],
    ['SL 4.4', 'Correlation and regression', ['Draw and interpret scatter diagrams', 'Calculate and interpret Pearson’s product-moment correlation coefficient r', 'Find the regression line of y on x and use it for prediction']],
    ['SL 4.5', 'Probability concepts', ['Understand trial, outcome, sample space and event', 'Calculate probabilities, including complementary events', 'Find expected numbers of occurrences']],
    ['SL 4.6', 'Combined events', ['Use Venn diagrams, tree diagrams, sample space diagrams and tables', 'Calculate probabilities of combined, mutually exclusive and independent events', 'Calculate conditional probabilities']],
    ['SL 4.7', 'Discrete random variables', ['Use discrete probability distributions', 'Calculate expected values and apply them, e.g. to fair games']],
    ['SL 4.8', 'Binomial distribution', ['Recognise binomial situations', 'Calculate binomial probabilities, mean and variance']],
    ['SL 4.9', 'Normal distribution', ['Describe the properties of the normal distribution', 'Calculate normal probabilities and inverse normal values with technology']],
    ['SL 4.10', 'Regression line of x on y', ['Find the regression line of x on y and use it for prediction']],
    ['SL 4.11', 'Conditional probability and independence', ['Use the formal definition of conditional probability', 'Test whether events are independent']],
    ['SL 4.12', 'Standardisation', ['Standardise normal variables using z-values', 'Use inverse normal calculations to find an unknown mean or standard deviation']],
    ['AHL 4.13', 'Bayes’ theorem', ['Use Bayes’ theorem for up to three events']],
    ['AHL 4.14', 'Further random variables', ['Find the variance of a discrete random variable', 'Use continuous random variables and probability density functions', 'Find mode, median, mean and variance of continuous distributions, including linear transformations']],
  ]],
  ['Topic 5 — Calculus', { SL: 28, HL: 55 }, [
    ['SL 5.1', 'Limits and the derivative', ['Understand the concept of a limit', 'Interpret the derivative as a gradient and as a rate of change']],
    ['SL 5.2', 'Increasing and decreasing functions', ['Identify intervals where a function is increasing or decreasing', 'Interpret the graph of f′(x)']],
    ['SL 5.3', 'Differentiating polynomials', ['Differentiate f(x) = axⁿ (n ∈ ℤ) and polynomial functions']],
    ['SL 5.4', 'Tangents and normals', ['Find equations of tangents and normals at a given point']],
    ['SL 5.5', 'Introduction to integration', ['Integrate axⁿ (n ∈ ℤ, n ≠ −1) as anti-differentiation', 'Evaluate definite integrals using technology', 'Find the area between a curve and the x-axis']],
    ['SL 5.6', 'Differentiation rules', ['Differentiate xⁿ, sin x, cos x, eˣ and ln x', 'Use the chain, product and quotient rules']],
    ['SL 5.7', 'The second derivative', ['Find second derivatives', 'Relate the graphical behaviour of f, f′ and f″']],
    ['SL 5.8', 'Stationary points and optimisation', ['Find and classify local maxima and minima', 'Find points of inflexion', 'Solve optimisation problems in context']],
    ['SL 5.9', 'Kinematics', ['Solve problems involving displacement, velocity and acceleration', 'Find the total distance travelled']],
    ['SL 5.10', 'Indefinite integration', ['Integrate xⁿ, sin x, cos x, 1/x and eˣ', 'Integrate by inspection or by substitution of the form ∫f(g(x))g′(x) dx']],
    ['SL 5.11', 'Definite integrals and areas', ['Evaluate definite integrals analytically', 'Find areas between a curve and the x-axis and between two curves']],
    ['AHL 5.12', 'Continuity and first principles', ['Understand continuity and differentiability', 'Differentiate from first principles', 'Use higher derivatives']],
    ['AHL 5.13', 'Limits and L’Hôpital’s rule', ['Evaluate limits, including by repeated use of L’Hôpital’s rule']],
    ['AHL 5.14', 'Implicit differentiation and related rates', ['Differentiate implicitly', 'Solve related rates of change problems', 'Solve further optimisation problems']],
    ['AHL 5.15', 'Further derivatives and integrals', ['Differentiate tan x, sec x, cosec x, cot x, aˣ, logₐ x, arcsin x, arccos x and arctan x', 'Integrate the related derivatives and use partial fractions in integration']],
    ['AHL 5.16', 'Integration techniques', ['Integrate by substitution', 'Integrate by parts, including repeated integration by parts']],
    ['AHL 5.17', 'Areas and volumes of revolution', ['Find areas between a curve and the y-axis', 'Find volumes of revolution about the x- and y-axes']],
    ['AHL 5.18', 'Differential equations', ['Solve first-order differential equations numerically with Euler’s method', 'Solve by separation of variables, the homogeneous substitution y = vx and an integrating factor']],
    ['AHL 5.19', 'Maclaurin series', ['Derive Maclaurin series of functions', 'Use simple Maclaurin series, including by substitution, products, integration and differentiation', 'Use Maclaurin series to approximate solutions of differential equations']],
  ]],
];

const AI_UNITS = [
  ['Topic 1 — Number and algebra', { SL: 16, HL: 29 }, [
    ['SL 1.1', 'Scientific notation', ['Write and calculate with numbers in the form a × 10ᵏ, where 1 ≤ a < 10 and k ∈ ℤ']],
    ['SL 1.2', 'Arithmetic sequences and series', ['Use the formulae for the nth term and the sum of the first n terms', 'Use sigma notation', 'Apply to real-life contexts, including simple interest']],
    ['SL 1.3', 'Geometric sequences and series', ['Use the formulae for the nth term and the sum of the first n terms', 'Apply to real-life contexts such as growth and decay']],
    ['SL 1.4', 'Financial applications', ['Solve compound interest and annual depreciation problems', 'Use technology (e.g. a TVM solver) for financial calculations']],
    ['SL 1.5', 'Exponents and logarithms', ['Apply the laws of exponents with integer exponents', 'Understand logarithms with base 10 and base e and evaluate them with technology']],
    ['SL 1.6', 'Approximation and error', ['Round to decimal places and significant figures', 'Find upper and lower bounds', 'Calculate percentage errors', 'Make and check estimates']],
    ['SL 1.7', 'Loans and annuities', ['Solve amortisation and annuity problems using technology']],
    ['SL 1.8', 'Solving equations with technology', ['Solve systems of linear equations in up to three unknowns using technology', 'Solve polynomial equations using technology']],
    ['AHL 1.9', 'Laws of logarithms', ['Apply the laws of logarithms']],
    ['AHL 1.10', 'Rational exponents', ['Simplify expressions with rational exponents']],
    ['AHL 1.11', 'Infinite geometric series', ['Find the sum of an infinite geometric sequence']],
    ['AHL 1.12', 'Complex numbers', ['Use the Cartesian form and perform operations with complex numbers', 'Represent complex numbers on an Argand diagram']],
    ['AHL 1.13', 'Polar and exponential form', ['Use modulus–argument and exponential forms', 'Multiply, divide and find powers, interpreting the results geometrically', 'Apply complex numbers in contexts such as AC circuits']],
    ['AHL 1.14', 'Matrices', ['Use matrix algebra: addition, multiplication, identity and zero matrices', 'Find determinants and inverses (2 × 2 by hand, larger with technology)', 'Solve systems of linear equations using matrices']],
    ['AHL 1.15', 'Eigenvalues and eigenvectors', ['Find eigenvalues and eigenvectors of 2 × 2 matrices', 'Diagonalise 2 × 2 matrices and use this to find powers', 'Apply to the long-term behaviour of systems']],
  ]],
  ['Topic 2 — Functions', { SL: 31, HL: 42 }, [
    ['SL 2.1', 'Equations of straight lines', ['Use different forms of the equation of a straight line', 'Find gradients and intercepts and use parallel and perpendicular gradients']],
    ['SL 2.2', 'Functions', ['Understand function, domain, range and graph', 'Use function notation', 'Understand inverse functions as reflections in the line y = x']],
    ['SL 2.3', 'Graphs of functions', ['Sketch and draw graphs using technology']],
    ['SL 2.4', 'Key features of graphs', ['Determine maxima, minima, intercepts, symmetry, vertex, zeros and asymptotes', 'Find intersections of two curves using technology']],
    ['SL 2.5', 'Modelling with functions', ['Model with linear, quadratic, exponential, direct and inverse variation, cubic and sinusoidal functions']],
    ['SL 2.6', 'The modelling process', ['Develop and fit models to data', 'Test and reflect on models and use them to make predictions']],
    ['AHL 2.7', 'Composite and inverse functions', ['Form composite functions', 'Find inverse functions, including on restricted domains']],
    ['AHL 2.8', 'Transformations of graphs', ['Apply translations, reflections and stretches, including composite transformations']],
    ['AHL 2.9', 'Further modelling', ['Model with exponential growth and decay, logistic, natural logarithm, sinusoidal and piecewise functions']],
    ['AHL 2.10', 'Logarithmic scales and linearising data', ['Scale very large or very small numbers using logarithms', 'Linearise data using log–log and semi-log graphs']],
  ]],
  ['Topic 3 — Geometry and trigonometry', { SL: 18, HL: 46 }, [
    ['SL 3.1', 'Three-dimensional geometry', ['Find distances and midpoints in three dimensions', 'Calculate volumes and surface areas of 3D solids', 'Find the angle between a line and a plane']],
    ['SL 3.2', 'Triangle trigonometry', ['Use trigonometric ratios in right-angled triangles', 'Use the sine rule, the cosine rule and ½ab sin C']],
    ['SL 3.3', 'Applications of trigonometry', ['Solve problems involving angles of elevation and depression and bearings', 'Construct labelled diagrams from written statements']],
    ['SL 3.4', 'Arcs and sectors', ['Find arc length and sector area using degrees']],
    ['SL 3.5', 'Perpendicular bisectors', ['Find equations of perpendicular bisectors']],
    ['SL 3.6', 'Voronoi diagrams', ['Identify sites, vertices, edges and cells', 'Add a site to a Voronoi diagram and use nearest-neighbour interpolation', 'Solve the “toxic waste dump” (largest empty circle) problem']],
    ['AHL 3.7', 'Radian measure', ['Use radian measure and find arc length and sector area in radians']],
    ['AHL 3.8', 'The unit circle and trigonometric equations', ['Define sin and cos using the unit circle and use the Pythagorean identity', 'Recognise the ambiguous case of the sine rule', 'Solve trigonometric equations graphically']],
    ['AHL 3.9', 'Matrix transformations', ['Represent reflections, rotations, enlargements and stretches as matrices', 'Compose transformations', 'Use the determinant as an area scale factor']],
    ['AHL 3.10', 'Vectors', ['Represent vectors algebraically and geometrically', 'Use position vectors, magnitude, unit vectors and base vectors']],
    ['AHL 3.11', 'Vector equations of lines', ['Write vector equations of lines in 2D and 3D', 'Model motion with constant velocity']],
    ['AHL 3.12', 'Kinematics with vectors', ['Solve kinematics problems with variable velocity in 2D', 'Model projectile and circular motion']],
    ['AHL 3.13', 'Scalar and vector products', ['Calculate scalar and vector products', 'Find angles between vectors and components of vectors']],
    ['AHL 3.14', 'Graph theory', ['Use graph terminology: vertices, edges, degree; simple, complete, weighted and directed graphs', 'Identify subgraphs and trees']],
    ['AHL 3.15', 'Adjacency matrices', ['Use adjacency matrices to count walks of length k', 'Use weighted adjacency tables and transition matrices for graphs']],
    ['AHL 3.16', 'Graph algorithms', ['Find minimum spanning trees with Kruskal’s and Prim’s algorithms', 'Solve the Chinese postman problem', 'Find bounds for the travelling salesman problem (nearest neighbour and deleted vertex)']],
  ]],
  ['Topic 4 — Statistics and probability', { SL: 36, HL: 52 }, [
    ['SL 4.1', 'Collecting data', ['Distinguish population and sample, and discrete and continuous data', 'Identify bias and judge reliability', 'Describe simple random, convenience, systematic, quota and stratified sampling']],
    ['SL 4.2', 'Presenting data', ['Construct and interpret frequency tables, histograms and cumulative frequency graphs', 'Construct box-and-whisker plots and identify outliers']],
    ['SL 4.3', 'Measures of central tendency and dispersion', ['Calculate mean, median, mode, quartiles, range, IQR and standard deviation', 'Estimate statistics for grouped data using technology', 'Describe the effect of constant changes to data']],
    ['SL 4.4', 'Correlation and regression', ['Interpret scatter diagrams and lines of best fit', 'Calculate and interpret Pearson’s r', 'Find the regression line of y on x and use it appropriately']],
    ['SL 4.5', 'Probability concepts', ['Understand trial, outcome, sample space and event, and calculate probabilities', 'Find expected numbers of occurrences']],
    ['SL 4.6', 'Combined events', ['Use Venn diagrams, tree diagrams, sample space diagrams and tables', 'Calculate probabilities of combined, mutually exclusive, conditional and independent events']],
    ['SL 4.7', 'Discrete random variables', ['Use discrete probability distributions and find expected values']],
    ['SL 4.8', 'Binomial distribution', ['Calculate binomial probabilities, mean and variance']],
    ['SL 4.9', 'Normal distribution', ['Use the properties of the normal distribution', 'Calculate normal probabilities and inverse normal values with technology']],
    ['SL 4.10', 'Spearman’s rank correlation', ['Calculate and interpret Spearman’s rank correlation coefficient', 'Judge when Spearman’s is more appropriate than Pearson’s']],
    ['SL 4.11', 'Hypothesis testing', ['Formulate null and alternative hypotheses and use significance levels and p-values', 'Carry out χ² tests for independence and goodness of fit', 'Use the t-test to compare two means']],
    ['AHL 4.12', 'Designing data collection', ['Design data collection methods, surveys and questionnaires', 'Choose relevant variables and categorise numerical data', 'Test reliability and validity']],
    ['AHL 4.13', 'Non-linear regression', ['Fit non-linear regression models using technology', 'Use the sum of squared residuals and the coefficient of determination R²']],
    ['AHL 4.14', 'Linear combinations and unbiased estimators', ['Find the expected value and variance of linear transformations and combinations of random variables', 'Find unbiased estimates of the mean and variance']],
    ['AHL 4.15', 'The central limit theorem', ['Use linear combinations of independent normal variables', 'Apply the central limit theorem']],
    ['AHL 4.16', 'Confidence intervals', ['Find confidence intervals for the mean of a normal population']],
    ['AHL 4.17', 'Poisson distribution', ['Use the Poisson distribution, its mean and variance', 'Use sums of independent Poisson variables']],
    ['AHL 4.18', 'Further hypothesis testing', ['Use critical values and critical regions', 'Test a population mean (normal), a proportion (binomial) and a mean (Poisson)', 'Test for correlation and understand Type I and Type II errors']],
    ['AHL 4.19', 'Markov chains', ['Use transition matrices and state diagrams', 'Find steady-state and long-term probabilities']],
  ]],
  ['Topic 5 — Calculus', { SL: 19, HL: 41 }, [
    ['SL 5.1', 'Limits and the derivative', ['Understand the concept of a limit', 'Interpret the derivative as a gradient and as a rate of change']],
    ['SL 5.2', 'Increasing and decreasing functions', ['Identify increasing and decreasing functions', 'Interpret f′(x) graphically']],
    ['SL 5.3', 'Differentiating axⁿ', ['Differentiate axⁿ (n ∈ ℤ) and sums of such terms']],
    ['SL 5.4', 'Tangents and normals', ['Find equations of tangents and normals']],
    ['SL 5.5', 'Introduction to integration', ['Integrate axⁿ (n ∈ ℤ, n ≠ −1) as anti-differentiation', 'Evaluate definite integrals with technology and find areas between a curve and the x-axis']],
    ['SL 5.6', 'Stationary points', ['Find values of x where the gradient is zero', 'Find local maximum and minimum points']],
    ['SL 5.7', 'Optimisation', ['Solve optimisation problems in context']],
    ['SL 5.8', 'Trapezoidal rule', ['Approximate areas using the trapezoidal rule']],
    ['AHL 5.9', 'Further differentiation', ['Differentiate sin x, cos x, tan x, eˣ, ln x and xⁿ (n ∈ ℚ)', 'Use the chain, product and quotient rules', 'Solve related rates of change problems']],
    ['AHL 5.10', 'The second derivative', ['Use the second derivative and its graphical meaning', 'Find points of inflexion']],
    ['AHL 5.11', 'Further integration', ['Integrate xⁿ (n ∈ ℚ), sin x, cos x, 1/x and eˣ', 'Integrate by inspection or substitution']],
    ['AHL 5.12', 'Areas and volumes of revolution', ['Find areas enclosed by a curve and the x- or y-axis', 'Find volumes of revolution about the x- or y-axis']],
    ['AHL 5.13', 'Kinematics', ['Solve problems involving displacement, velocity and acceleration', 'Find the total distance travelled']],
    ['AHL 5.14', 'Differential equations', ['Set up differential equations from context', 'Solve by separation of variables']],
    ['AHL 5.15', 'Slope fields', ['Sketch and interpret slope fields']],
    ['AHL 5.16', 'Euler’s method', ['Use Euler’s method for first-order differential equations and coupled systems']],
    ['AHL 5.17', 'Phase portraits', ['Draw and interpret phase portraits of coupled linear systems', 'Use eigenvalues to classify the behaviour of solutions']],
    ['AHL 5.18', 'Second-order differential equations', ['Solve second-order differential equations with Euler’s method using an equivalent coupled system']],
  ]],
];

/* ISL MYP 9 and MYP 10 curricula (school documents, September 2026), in the library's text format
   (see parseCurriculumText below): ## unit, ### [Extended] code title, - outcome. */
const MYP9_TEXT = String.raw`
## Topic 1 — Number and algebra
### 1.1 Number systems and representations
- Identify and classify rational and irrational numbers
- Convert between fractions, decimals and radicals

### 1.2 Radicals and roots
- Simplify radicals, including higher-order roots
- Apply operations with radicals

### 1.3 Laws of exponents
- Apply laws of exponents with integer and fractional powers

### 1.4 Algebraic expressions
- Simplify algebraic expressions using the distributive property
- Combine like terms
- Expand polynomial products
- Factorise binomial and trinomial expressions with a common factor

### 1.5 Linear equations
- Solve single-variable linear equations
- Solve equations involving decimals and simple algebraic fractions
- Solve literal equations by making a variable the subject

### 1.6 Inequalities
- Solve linear inequalities
- Represent solutions graphically on a number line

### 1.7 Systems of linear equations
- Solve systems of linear equations using substitution
- Solve systems of linear equations using elimination
- Solve systems of linear equations graphically

### [Extended] 1.8 Exponential equations
- Solve exponential equations

### [Extended] 1.9 Further linear equations
- Solve complex multi-step equations involving nested expressions or multiple variables

### [Extended] 1.10 Further inequalities and absolute value
- Solve linear and non-linear inequalities
- Represent solutions using interval notation
- Solve absolute value equations and inequalities
- Solve compound inequalities

### [Extended] 1.11 Linear programming
- Solve linear programming problems

## Topic 2 — Functions
### 2.1 Introduction to functions
- Understand a function as a relation where each input has one output
- Use and interpret function notation
- Distinguish between expressions, equations and functions

### 2.2 Domain and range
- Determine the domain and range of linear and quadratic functions
- Express domain and range using set notation or inequalities
- Determine appropriate domain and range from graphs and contexts

### 2.3 Evaluating functions
- Evaluate functions for given input values
- Substitute expressions into functions
- Apply functions in real-world contexts

### 2.4 Linear functions
- Graph linear functions using slope-intercept form
- Interpret slope as rate of change
- Interpret the y-intercept as a starting value
- Analyse the effects of changing slope and intercept

### 2.5 Graphs and key features of quadratic functions
- Graph quadratic functions
- Identify the vertex
- Identify the axis of symmetry
- Identify x-intercepts and y-intercepts

### 2.6 Forms of quadratic functions
- Sketch quadratic functions from standard, vertex and factored forms
- Convert factored form to standard form
- Convert vertex form to standard form
- Interpret key features from different forms

### [Extended] 2.7 Quadratic modelling and transformations
- Model real-world situations using quadratic functions
- Solve problems involving maximum and minimum values
- Analyse vertical and horizontal translations
- Analyse vertical and horizontal stretches and compressions

## Topic 3 — Geometry and trigonometry
### 3.1 Angles and polygons
- Apply the polygon angle sum theorem
- Find missing angles in regular and irregular polygons
- Apply angle relationships formed by parallel lines and transversals

### 3.2 Quadrilaterals
- Classify quadrilaterals using their properties
- Apply properties of parallelograms, rectangles, rhombuses and trapezoids
- Find missing sides and angles in quadrilaterals

### 3.3 Pythagorean theorem
- Apply the Pythagorean theorem to find missing sides
- Apply the converse of the Pythagorean theorem
- Apply the Pythagorean theorem in coordinate geometry
- Apply the Pythagorean theorem in three-dimensional problems

### 3.4 Similarity
- Identify similar figures using corresponding angles and sides
- Apply scale factors
- Establish similarity of triangles using corresponding angles

### 3.5 Coordinate geometry
- Calculate distances between points
- Use coordinates to verify geometric properties
- Solve geometric problems in the coordinate plane

### 3.6 Surface area and volume
- Decompose composite figures
- Calculate area and perimeter of composite figures
- Calculate surface area and volume of composite 3D figures
- Determine unknown dimensions before calculating area, surface area or volume

### 3.7 Trigonometry
- Use sine, cosine and tangent ratios
- Find unknown sides in right-angled triangles
- Find unknown angles in right-angled triangles
- Apply trigonometry to real-life measurement problems
- Apply trigonometry to composite figures

### 3.8 Geometric reasoning
- Combine geometric relationships to solve multi-step problems
- Justify solutions using appropriate geometric reasoning

### [Extended] 3.9 Non-right-angled triangle trigonometry
- Apply the sine rule
- Apply the cosine rule
- Solve problems involving non-right-angled triangles

## Topic 4 — Statistics and probability
### 4.1 Types of data
- Distinguish between qualitative and quantitative data
- Distinguish between primary and secondary data

### 4.2 Frequency tables and data displays
- Organise data in frequency tables
- Create and interpret dot plots
- Create and interpret bar charts
- Create and interpret histograms
- Create and interpret pie charts
- Create and interpret stem-and-leaf plots

### 4.3 Box-and-whisker plots
- Create and interpret box-and-whisker plots

### 4.4 Measures of central tendency and dispersion
- Calculate and interpret mean, median and mode
- Calculate and interpret range
- Calculate and interpret interquartile range
- Calculate and interpret mean absolute deviation

### 4.5 Outliers
- Identify outliers
- Analyse the effect of outliers on measures of centre and spread

### 4.6 Probability concepts
- Understand events, outcomes and sample spaces
- Calculate theoretical probability
- Express probabilities as fractions, decimals and percentages
- Calculate probabilities of complementary events

### 4.7 Experimental probability
- Conduct probability experiments
- Calculate experimental probability
- Calculate relative frequency
- Compare theoretical and experimental probability

### 4.8 Compound probability
- Use Venn diagrams to represent events
- Use tree diagrams to represent multi-stage experiments
- Apply addition rules to calculate probabilities
- Apply multiplication rules to calculate probabilities

### [Extended] 4.9 Conditional probability
- Understand conditional probability
- Calculate conditional probabilities
- Distinguish between independent and dependent events
- Use two-way tables to calculate conditional probabilities
- Use Venn diagrams to calculate conditional probabilities
- Use tree diagrams to calculate conditional probabilities
- Solve contextual conditional probability problems
`;

const MYP10_TEXT = String.raw`
## Topic 1 — Number and algebra
### 1.1 Quadratic equations and intercepts
- Solve quadratic equations by factorising
- Solve quadratic equations using the quadratic formula
- Identify when a quadratic equation is not factorable
- Solve quadratic equations by completing the square
- Find x- and y-intercepts of quadratic functions

### 1.2 Algebraic identities and fractions
- Apply standard algebraic identities
- Simplify and manipulate algebraic fractions

### 1.3 Exponential equations
- Solve exponential equations using laws of exponents

### 1.4 Logarithmic forms and laws
- Understand exponential and logarithmic forms
- Convert between exponential and logarithmic forms
- Apply laws of logarithms

### 1.5 Logarithmic equations and exponential models
- Solve logarithmic equations
- Use logarithms to solve exponential equations and models

### 1.6 Sequences and series
- Identify arithmetic sequences
- Identify geometric sequences
- Find the nth term of arithmetic and geometric sequences
- Calculate sums of arithmetic series
- Calculate sums of geometric series
- Apply sequences and series to real-life problems

### 1.7 Binomial expansion
- Expand binomial expressions using the Binomial Theorem
- Use Pascal’s Triangle to determine coefficients
- Determine specific terms in a binomial expansion

### [Extended] 1.8 Complex algebraic fractions
- Work with complex algebraic fractions

### [Extended] 1.9 Binomial expansion up to the fifth power
- Expand binomial expressions up to the fifth power

## Topic 2 — Functions
### 2.1 Features of functions
- Determine domain and range of linear, quadratic and exponential functions
- Identify x- and y-intercepts
- Analyse the shape and behaviour of functions
- Interpret rates of change and growth patterns

### 2.2 Quadratic functions
- Convert between standard, factored and vertex forms
- Identify roots from factored form
- Identify the vertex from vertex form
- Determine the number of zeros of a quadratic function
- Construct quadratic functions from graphs, data and descriptions

### 2.3 Exponential and logarithmic functions
- Construct exponential functions from graphs, data and descriptions
- Construct logarithmic functions from graphs
- Interpret exponential and logarithmic models

### 2.4 Sign diagrams
- Construct sign diagrams
- Determine intervals where a function is positive, negative or zero
- Relate sign diagrams to intercepts and graph behaviour

### 2.5 Composite functions
- Understand composite functions
- Evaluate composite functions
- Determine the domain of composite functions

### 2.6 Inverse functions
- Determine whether a function has an inverse
- Find inverse functions algebraically
- Interpret inverse functions graphically
- Understand reflection in the line \(y=x\)

### 2.7 Graphing functions
- Graph quadratic functions
- Graph modulus/absolute-value functions
- Graph exponential functions
- Graph logarithmic functions
- Identify domain, range, intercepts, symmetry, asymptotes and turning points
- Determine points of intersection graphically

### 2.8 Transformations of functions
- Apply horizontal and vertical translations
- Apply reflections
- Apply stretches and compressions
- Describe transformations algebraically and graphically

### 2.9 Mathematical modelling
- Create functions from verbal descriptions and data
- Apply functions to real-world situations
- Interpret models and make predictions from graphs

## Topic 3 — Geometry and trigonometry
### 3.1 Sine and cosine rules
- Apply the sine rule
- Apply the cosine rule
- Determine when to use the sine or cosine rule
- Solve non-right-angled triangles

### 3.2 Applications of trigonometry
- Solve problems involving angles of elevation and depression
- Solve problems involving bearings
- Solve multi-step 2D trigonometric problems
- Decompose complex diagrams into solvable triangles

### 3.3 Unit circle
- Understand the relationship between the unit circle, sine and cosine
- Determine sine and cosine values for common angles
- Work with angles in degrees and radians

### 3.4 Trigonometric functions
- Graph sine and cosine functions
- Identify amplitude and period
- Apply vertical and horizontal translations
- Apply amplitude changes
- Apply period changes
- Apply phase shifts

### 3.5 Radian measure
- Convert between degrees and radians
- Interpret angles expressed in radians
- Apply radians in trigonometric calculations

### 3.6 Circle theorems
- Apply the angle-at-the-centre theorem
- Apply angles-in-the-same-segment theorem
- Apply the angle-in-a-semicircle theorem
- Apply cyclic quadrilateral properties
- Apply tangent properties
- Apply the alternate segment theorem

### [Extended] 3.7 Arc length and sector area
- Calculate arc length
- Calculate sector area
- Apply arc length and sector area in contextual problems

### [Extended] 3.8 Trigonometric equations
- Solve simple sine equations
- Solve simple cosine equations
- Solve simple tangent equations
- Find multiple solutions within a specified interval

## Topic 4 — Statistics and probability
### 4.1 Data collection and sampling
- Distinguish between populations and samples
- Apply random sampling
- Apply stratified sampling
- Apply systematic sampling
- Identify biased sampling methods
- Design and evaluate surveys
- Consider ethical issues in data collection

### 4.2 Scatter plots and correlation
- Construct and interpret scatter plots
- Identify positive, negative and no correlation
- Distinguish between correlation and causation
- Calculate and interpret Pearson’s correlation coefficient

### 4.3 Linear models and prediction
- Determine a linear model using estimation or technology
- Use interpolation
- Use extrapolation
- Evaluate limitations of extrapolation

### 4.4 Probability concepts
- Calculate probabilities of single events
- Calculate probabilities of compound events
- Use tree diagrams
- Use two-way tables
- Distinguish between mutually exclusive events
- Distinguish between independent and dependent events

### 4.5 Conditional probability
- Calculate conditional probabilities
- Interpret conditional probability
- Apply conditional probability using formulas, tree diagrams and two-way tables

### [Extended] 4.6 Counting principles
- Apply the fundamental counting principle
- Use factorial notation
- Calculate permutations
- Calculate combinations
- Select appropriate counting methods for contextual problems

### [Extended] 4.7 Normal distribution
- Understand the normal distribution
- Use technology to calculate probabilities
- Interpret areas under a normal curve
- Use z-scores
- Apply the normal distribution to contextual problems
`;

const MYP_STRANDS = ['Number', 'Algebra', 'Geometry & trigonometry', 'Statistics & probability'];

/* Non-DP: High School Diploma Mathematics, Grades 11–12 (school proposal, September 2026), as supplied.
   "# Grade 11 — …" sections become the levels Grade 11 / Grade 12; "[Optional Extension]" marks enrichment
   topics (not a level) — see nonDpLibraryText(). */
const NONDP_TEXT = String.raw`
# High School Diploma Mathematics — Grades 11–12
Quantitative Reasoning and Applied Mathematics
Proposed curriculum based on the supplied Scheme of Work; subject to school approval and applicable requirements.
[Optional Extension] identifies enrichment content, not a separate course level.

# Grade 11 — Foundations of Applied Mathematics

## Topic 1 — Core numeracy, proportional reasoning and algebra
### 1.1 Number fluency and estimation
- Use place value, negative numbers and the order of operations correctly
- Round numbers and estimate calculations
- Use a calculator accurately and check whether answers are reasonable in context

### 1.2 Fractions, decimals and percentages
- Convert between fractions, decimals and percentages
- Use equivalent representations to solve practical problems

### 1.3 Ratio, proportion and rates
- Use ratio notation and solve ratio problems
- Apply direct proportion in practical contexts
- Calculate and interpret unit rates, including speed, cost per unit and earnings per hour

### 1.4 Percentage change
- Calculate percentage increases and decreases using multipliers
- Apply percentages to discounts, tax, tips and service charges
- Interpret percentage changes in context

### 1.5 Algebraic expressions and linear equations
- Use algebraic notation to represent practical situations
- Simplify expressions by combining like terms
- Solve one-step and two-step linear equations using inverse operations
- Check solutions by substitution

### 1.6 Substitution and formulae
- Substitute values into practical formulae, including C = 2πr and A = πr²
- Rearrange simple formulae, including d = rt, to change the subject
- Use appropriate units and interpret calculated values

### [Optional Extension] 1.7 Further percentages and formulae
- Solve reverse percentage problems
- Calculate successive percentage changes
- Rearrange formulae requiring more than one step

## Topic 2 — Financial mathematics I: personal finance
### 2.1 Income, expenditure and budgeting
- Create and interpret a personal budget
- Distinguish between fixed and variable costs
- Calculate disposable income and plan savings
- Interpret payslips, bills and bank statements

### 2.2 Prices and best-buy comparisons
- Calculate final costs after discounts, tax and service charges
- Compare prices using unit rates
- Justify purchasing decisions using calculations and relevant conditions

### 2.3 Currency conversion
- Convert between currencies using a given exchange rate
- Interpret the direction of an exchange rate correctly
- Include relevant transaction or card fees when comparing costs

### 2.4 Simple interest
- Calculate simple interest using I = Prt
- Express percentage interest rates as decimals and use consistent time units
- Interpret the interest earned and the final balance

### 2.5 Compound interest and savings
- Calculate compound growth using A = P(1 + r)ⁿ in simple contexts
- Use a calculator or spreadsheet to compare simple and compound interest
- Compare savings options and justify a financial recommendation

## Topic 3 — Data literacy and descriptive statistics
### 3.1 Types of data and frequency tables
- Distinguish between categorical and numerical data
- Organise data in frequency tables
- Choose suitable ways to present different types of data

### 3.2 Charts and graphs
- Construct and interpret bar charts, line graphs and pie charts
- Use appropriate scales, labels and units
- Identify misleading scales or presentations

### 3.3 Measures of centre and spread
- Calculate and interpret the mean, median, mode and range
- Select suitable summary measures for a dataset
- Use summary measures to describe data in context

### 3.4 Scatter diagrams and correlation
- Construct and interpret scatter diagrams
- Describe the direction and strength of a relationship informally
- Distinguish correlation from causation

### 3.5 Statistical communication
- Interpret numerical and graphical evidence
- Write a short statistical conclusion supported by data
- Explain limitations of the evidence and avoid unsupported claims

## Topic 4 — Graphs, functions and real-life modelling
### 4.1 Coordinates and graph reading
- Plot and read points in the coordinate plane
- Interpret graph scales, axes and units accurately
- Connect points and graphs to the quantities they represent

### 4.2 Gradient and intercepts
- Calculate gradient using m = Δy/Δx
- Interpret gradient as a rate of change
- Identify intercepts and interpret the vertical intercept as an initial value

### 4.3 Linear relationships
- Draw and interpret straight-line graphs of the form y = mx + c
- Form linear models for practical situations
- Interpret the parameters of a linear model in context

### 4.4 Distance-time and cost models
- Interpret distance-time graphs and relate gradient to speed
- Model taxi fares, subscriptions and other costs using fixed and variable charges
- Use equations, tables and graphs to compare options

### 4.5 Intersections and break-even points
- Find intersections of simple graphs by hand or using technology
- Interpret an intersection as equal values in context
- Use intersections to compare plans and identify break-even points

### 4.6 Model interpretation and limitations
- Use a model to make predictions within a sensible range
- Explain assumptions and limitations
- Judge whether a prediction is reasonable in context

### [Optional Extension] 4.7 Introduction to non-linear models
- Recognise quadratic and exponential patterns visually
- Compare their graphical behaviour with linear models in practical contexts

## Topic 5 — Geometry, measurement and practical design
### 5.1 Units and conversions
- Convert between common units of length, area, volume and capacity
- Use appropriate units in calculations and final answers
- Estimate measurements and check their reasonableness

### 5.2 Perimeter, area and circles
- Calculate perimeter and area in practical contexts
- Decompose compound shapes into simpler shapes
- Calculate circle circumference using C = 2πr and area using A = πr²

### 5.3 Surface area and volume
- Calculate surface area and volume of simple solids using suitable formulae
- Apply V = lwh to rectangular prisms
- Interpret results in practical contexts such as packaging and storage

### 5.4 Scale drawings, maps and plans
- Interpret and use scale drawings
- Calculate actual dimensions from maps and plans
- Represent practical designs using an appropriate scale

### 5.5 Practical design and constraints
- Use measurements and calculations to complete a practical design task
- Account for constraints such as space, materials and cost
- Justify design choices and check whether quantities are reasonable

### [Optional Extension] 5.6 Right-angled trigonometry
- Use right-angled trigonometry in accessible measurement problems when prerequisite skills are secure

## Topic 6 — Applied project and portfolio review
### 6.1 Project question and planning
- Identify a clear practical question or context for a guided investigation
- Select relevant information and appropriate calculations
- Organise a plan for completing the task

### 6.2 Mathematical analysis and presentation
- Show relevant calculations clearly, including units and financial values where appropriate
- Include at least one table and at least one graph
- Explain how the mathematics addresses the chosen question

### 6.3 Conclusions and reflection
- Write a conclusion supported by calculations
- Reflect on assumptions and limitations
- Present the project in a short report and presentation

### 6.4 Portfolio review
- Select evidence of progress in applied mathematics
- Reflect on improvements and remaining learning needs
- Discuss progress and next steps using portfolio evidence

# Grade 12 — Applied Quantitative Reasoning

## Topic 1 — Financial mathematics II: credit, loans and planning
### 1.1 Compound growth and depreciation
- Calculate compound growth using A = P(1 + r)ⁿ
- Calculate depreciation using A = P(1 − r)ⁿ for a positive depreciation rate r
- Interpret changes in value over time using calculations, tables or spreadsheets

### 1.2 Inflation and purchasing power
- Explain the relationship between inflation and purchasing power
- Calculate the effect of repeated percentage increases on prices and budgets
- Interpret financial values in the context of changing costs

### 1.3 Savings and financial planning
- Compare savings options using calculations and stated assumptions
- Model savings over time using spreadsheets
- Evaluate whether a savings plan meets a stated goal

### 1.4 Credit, loans and repayments
- Interpret borrowing costs and repayment information
- Explain credit card interest and minimum repayments at an introductory level
- Use spreadsheets to model balances, interest and repayments over time
- Compare borrowing options using total costs and affordability

### 1.5 Financial decisions and limitations
- Compare renting and buying in a given scenario
- Make a financial recommendation supported by calculations
- State assumptions and explain limitations of a financial model

## Topic 2 — Statistics, sampling, bias and media literacy
### 2.1 Populations, samples and sampling methods
- Distinguish between a population and a sample
- Describe and compare sampling methods in accessible contexts
- Identify sampling bias and limitations of a sample

### 2.2 Questionnaire design and data quality
- Design and evaluate survey questions
- Identify leading or biased questions and rewrite them neutrally
- Evaluate the reliability and validity of collected information

### 2.3 Comparing datasets
- Compare datasets using appropriate averages and measures of spread
- Calculate and interpret median, quartiles and interquartile range
- Explain why averages alone may not provide a complete comparison

### 2.4 Grouped data and statistical displays
- Organise and interpret grouped data
- Interpret box plots and, where appropriate, histograms
- Use graphical displays to compare distributions in context

### 2.5 Statistical claims and media literacy
- Critique statistical claims using the data and methods behind them
- Identify misleading graphs and unsupported interpretations
- Distinguish correlation from causation when evaluating claims
- Write evidence-based conclusions that acknowledge limitations

### [Optional Extension] 2.6 Standard deviation
- Use technology to calculate standard deviation
- Interpret standard deviation as a measure of spread when comparing datasets

## Topic 3 — Probability, risk and decision-making
### 3.1 Probability concepts and representations
- Interpret the probability scale from 0 to 1
- Express probability as a fraction, decimal and percentage
- Calculate probabilities of simple events and their complements

### 3.2 Theoretical and experimental probability
- Calculate theoretical probabilities in simple contexts
- Use experimental results to estimate probabilities
- Compare theoretical probabilities with observed relative frequencies

### 3.3 Combined events and tree diagrams
- Distinguish between independent and dependent events
- Use tree diagrams to represent simple multi-stage situations
- Calculate probabilities of combined events using appropriate addition and multiplication
- Check whether independence is reasonable in the given context

### 3.4 Expected value and fair games
- Calculate expected value using E = Σx p(x) for a small set of possible outcomes
- Distinguish an expected long-run average from a guaranteed outcome
- Include participation costs when calculating expected net returns
- Judge whether a game or offer is mathematically fair

### 3.5 Risk and reward
- Compare options using probabilities and possible outcomes
- Explain risk and uncertainty in context
- Justify decisions using expected value and other relevant considerations

## Topic 4 — Modelling with spreadsheets and technology
### 4.1 Spreadsheet formulae and tables
- Construct tables using spreadsheet formulae
- Use cell references and fill-down methods correctly
- Check spreadsheet formulae and outputs for errors

### 4.2 Linear models
- Model constant rates of change using y = mx + c
- Generate tables and graphs for practical linear models
- Interpret initial values and rates of change in context

### 4.3 Percentage growth models
- Model percentage growth using A = P(1 + r)ⁿ
- Use repeated spreadsheet calculations for savings scenarios with deposits
- Interpret growth models and compare them with linear growth

### 4.4 Graphs, trend lines and predictions
- Create labelled graphs from spreadsheet data
- Use technology to display simple trend lines
- Make predictions and distinguish interpolation from extrapolation
- Explain risks of extrapolating beyond the available data

### 4.5 Evaluating and communicating models
- Compare predicted values with actual data
- Identify assumptions and limitations
- Explain whether a model is suitable for its intended purpose
- Present results clearly to a non-specialist audience

## Topic 5 — Capstone applied mathematics project
### 5.1 Research question and proposal
- Formulate a focused research question or decision problem
- Prepare a proposal with a feasible plan and suitable mathematical methods
- Define the context and purpose of the investigation

### 5.2 Data collection and source selection
- Collect relevant data or select a credible dataset
- Explain the source and method of data collection
- Consider data quality and limitations

### 5.3 Mathematical analysis
- Apply at least two appropriate mathematical techniques
- Show calculations clearly and accurately
- Use labelled tables and graphs to present findings
- Use technology appropriately and check outputs

### 5.4 Interpretation and recommendation
- Interpret results in relation to the original question
- Discuss assumptions, limitations and possible improvements
- Make a final recommendation or conclusion supported by evidence

### 5.5 Report, presentation and revision
- Organise the investigation into a clear written report
- Use feedback to revise the analysis and communication
- Give a short presentation explaining the mathematics and findings
- Reflect on the investigation and learning process

## Topic 6 — Portfolio, presentation and transition review
### 6.1 Selecting evidence of learning
- Select financial mathematics, statistics and modelling tasks that demonstrate progress
- Include the capstone project, student reflection and a summary of teacher feedback
- Organise the portfolio clearly and professionally

### 6.2 Reflection and future development
- Explain how mathematical skills have been applied in real contexts
- Identify strengths and areas for further development
- Use evidence to describe progress in accuracy, confidence and independence

### 6.3 Final presentation
- Present selected work clearly and professionally
- Explain mathematical decisions using calculations, graphs and contextual reasoning
- Connect learning to further study, work and everyday decision-making
`;
// The supplied document → the library's text format: each "# Grade N — …" section becomes the level "Grade N"
// (its units are titled "Grade N · Topic …" and its topics tagged [Grade N]); the title block before it is skipped.
function nonDpLibraryText(text) {
  let grade = '';
  return text.split(/\r?\n/).map(line => {
    const s = line.trim();
    const g = s.match(/^#\s+(Grade\s+\d+)\b/);
    if (g) { grade = g[1]; return ''; }
    if (!grade) return ''; // document title and notes
    if (/^##(?!#)/.test(s)) return `## ${grade} · ${s.replace(/^##\s*/, '')}`;
    if (/^###/.test(s)) {
      let t = s.replace(/^###\s*/, ''), ext = false;
      if (/^\[Optional Extension\]\s*/i.test(t)) { t = t.replace(/^\[Optional Extension\]\s*/i, ''); ext = true; }
      return `### [${grade}] ${t}${ext ? ' (optional extension)' : ''}`;
    }
    return line;
  }).join('\n');
}

// Library text → units with deterministic ids (myp9-u1, myp9-1-3, myp9-1-3-o2), so lessons, generator links
// and course units stay linked across updates.
// prefix(topic) separates topics whose codes repeat across levels (Non-DP: nondp-g11-1-1, nondp-g12-1-1).
function buildUnitsFromText(cid, text, tracks, prefix = () => '') {
  return parseCurriculumText(text, tracks).map((u, ui) => ({
    ...u, id: `${cid}-u${ui + 1}`,
    topics: u.topics.map((t, ti) => {
      const tid = `${cid}-${prefix(t)}${t.code ? t.code.replace(/\./g, '-') : `u${ui + 1}t${ti + 1}`}`;
      return { ...t, id: tid, outcomes: t.outcomes.map((o, oi) => ({ ...o, id: `${tid}-o${oi + 1}` })) };
    }),
  }));
}

// Deterministic ids, so lessons stay linked when the official content is restored.
function buildUnits(cid, units) {
  return units.map(([title, hours, topics], ui) => ({
    id: `${cid}-u${ui + 1}`, title, hours,
    topics: topics.map(([code, ttitle, outcomes]) => {
      const tid = `${cid}-${code.replace(/^\D+/, '').replace('.', '-')}`;
      return {
        id: tid, code, title: ttitle, tracks: code.startsWith('AHL') ? ['HL'] : [],
        outcomes: outcomes.map((text, i) => ({ id: `${tid}-o${i + 1}`, text, tracks: [] })),
      };
    }),
  }));
}

function builtinCurricula() {
  const source = 'IB Mathematics guide, first assessment 2021 (outcomes paraphrased)';
  return [
    { id: 'myp8', name: CANONICAL_NAMES.myp8.name, short: 'MYP 8', programme: 'MYP', tracks: [], units: [] },
    { id: 'myp9', name: CANONICAL_NAMES.myp9.name, short: 'MYP 9', programme: 'MYP', tracks: ['Standard', 'Extended'], builtin: true, source: 'ISL MYP 9 curriculum (September 2026)', units: buildUnitsFromText('myp9', MYP9_TEXT, ['Standard', 'Extended']) },
    { id: 'myp10', name: CANONICAL_NAMES.myp10.name, short: 'MYP 10', programme: 'MYP', tracks: ['Standard', 'Extended'], builtin: true, source: 'ISL MYP 10 curriculum (September 2026)', units: buildUnitsFromText('myp10', MYP10_TEXT, ['Standard', 'Extended']) },
    { id: 'nondp', name: CANONICAL_NAMES.nondp.name, short: CANONICAL_NAMES.nondp.short, programme: 'Other', tracks: ['Grade 11', 'Grade 12'], builtin: true,
      source: 'High School Diploma Mathematics, Grades 11–12 — proposed curriculum based on the Scheme of Work; subject to school approval',
      units: buildUnitsFromText('nondp', nonDpLibraryText(NONDP_TEXT), ['Grade 11', 'Grade 12'], t => (t.tracks[0] ? `g${t.tracks[0].replace(/\D/g, '')}-` : '')) },
    { id: 'dp-aa', name: CANONICAL_NAMES['dp-aa'].name, short: CANONICAL_NAMES['dp-aa'].short, programme: 'DP', tracks: ['SL', 'HL'], builtin: true, source, units: buildUnits('dp-aa', AA_UNITS) },
    { id: 'dp-ai', name: CANONICAL_NAMES['dp-ai'].name, short: CANONICAL_NAMES['dp-ai'].short, programme: 'DP', tracks: ['SL', 'HL'], builtin: true, source, units: buildUnits('dp-ai', AI_UNITS) },
  ];
}

/* ---------- state & lookup helpers ---------- */
// Updated school curricula replace the saved version once (then your later edits are kept).
const CURRICULUM_UPDATES = { myp9: '2026-09', myp10: '2026-09', nondp: '2026-09' };
function ensureCurricula() {
  const S = App.state;
  if (!Array.isArray(S.curricula)) { S.curricula = builtinCurricula(); App.save(true); }
  S.curriculumVersions = S.curriculumVersions || {};
  // New built-in content fills curricula that are still empty; an update listed above replaces it once.
  let changed = false;
  builtinCurricula().forEach(b => {
    const cur = S.curricula.find(c => c.id === b.id);
    const update = CURRICULUM_UPDATES[b.id] && S.curriculumVersions[b.id] !== CURRICULUM_UPDATES[b.id];
    if (update) S.curriculumVersions[b.id] = CURRICULUM_UPDATES[b.id];
    if (!cur) { if (b.builtin) { S.curricula.push(b); changed = true; } return; }
    if (update) {
      Object.assign(cur, { units: b.units, builtin: true, source: b.source, name: b.name, tracks: b.tracks });
      changed = true;
      return;
    }
    if (b.builtin && !cur.units.length && b.units.length) {
      Object.assign(cur, { units: b.units, builtin: true, source: b.source, name: b.name, tracks: cur.tracks.length ? cur.tracks : b.tracks });
      changed = true;
    }
  });
  if (changed) { syncCourseUnits(S); App.save(true); }
  S.classLevels = S.classLevels || {};
  return S.curricula;
}
function curriculum(id) { return (App.state.curricula || []).find(c => c.id === id); }
function inTrack(item, track) { return !track || !item.tracks?.length || item.tracks.includes(track); }

// Every selectable level, e.g. "MYP 9 Extended", "DP AA HL" (the same naming as the courses, e.g. "DP AI SL").
function curriculumLevels() {
  return (App.state.curricula || []).flatMap(c => c.tracks.length
    ? c.tracks.map(t => ({ key: `${c.id}|${t}`, cid: c.id, track: t, label: `${c.short} ${t}`, c }))
    : [{ key: c.id, cid: c.id, track: '', label: c.short, c }]);
}
function parseLevel(key) {
  const [cid, track = ''] = String(key || '').split('|');
  return { cid, track, c: curriculum(cid) };
}
function levelLabel(key) { const { c, track } = parseLevel(key); return c ? (track ? `${c.short} ${track}` : c.short) : ''; }
// Full name of a level: "DP Mathematics: Applications and Interpretation SL", "MYP Mathematics — Grade 9 (MYP Year 4) Extended"
function levelName(c, track) { return c ? `${c.name}${track ? ` ${track}` : ''}` : ''; }
function levelTopics(key) {
  const { c, track } = parseLevel(key);
  if (!c) return [];
  return c.units.flatMap(u => u.topics.filter(t => inTrack(t, track)).map(t => ({ unit: u, topic: t })));
}
function findTopic(topicId) {
  for (const c of App.state.curricula || []) for (const u of c.units) for (const t of u.topics) if (t.id === topicId) return { c, unit: u, topic: t };
  return null;
}
function strandColor(strand) {
  return { Number: '#2563eb', Algebra: '#9333ea', 'Geometry & trigonometry': '#059669', 'Statistics & probability': '#d97706' }[strand] || '#64748b';
}
function trackBadge(item, c) {
  if (!item.tracks?.length || !c || item.tracks.length >= c.tracks.length) return '';
  return `<span class="badge tone-warning">${esc(item.tracks.join(' / '))} only</span>`;
}

// How often each outcome appears in lesson plans: { [outcomeId]: { planned, taught } }
function outcomeCoverage() {
  const cov = {};
  (App.state.lessons || []).forEach(l => (l.curriculum?.outcomeIds || []).forEach(id => {
    const x = cov[id] || (cov[id] = { planned: 0, taught: 0 });
    x.planned++;
    if (l.status === 'taught') x.taught++;
  }));
  return cov;
}
function coverageMark(cov) {
  if (!cov) return '<span class="cov cov-none" title="Not planned yet">○</span>';
  if (cov.taught) return `<span class="cov cov-taught" title="Taught ${cov.taught}×">✓${cov.taught > 1 ? cov.taught : ''}</span>`;
  return `<span class="cov cov-planned" title="Planned ${cov.planned}×">◐</span>`;
}

// Curriculum id → course id used by lesson plans (for colours and filters).
// The course that takes its units from this curriculum level (exact level first, then any level of the curriculum).
function courseForCurriculum(cid, track = '') {
  const cs = App.state.courses || [];
  const exact = cs.find(c => c.curriculumLevel === (track ? `${cid}|${track}` : cid));
  return (exact || cs.find(c => (c.curriculumLevel || '').split('|')[0] === cid))?.id || '';
}
// The curriculum level a course follows, as a selectable key ("myp9" becomes "myp9|Standard" when the curriculum has levels).
function levelForCourse(courseId) {
  const lv = App.course(courseId)?.curriculumLevel || '';
  const { c, track } = parseLevel(lv);
  if (!c) return '';
  return track || !c.tracks.length ? lv : `${c.id}|${c.tracks[0]}`;
}

/* ---------- import / export as plain text ----------
   ## Unit title
   ### Topic title          (optionally "### 2.6 Quadratic functions" → code 2.6)
   - outcome                 (all tracks)
   - [E] outcome             (Extended only; [S], [SL], [HL] or full track names also work)
   Tab-separated rows pasted from Excel also work:  Unit ⇥ Topic ⇥ Outcome ⇥ Track (optional) */
function parseCurriculumText(text, tracks) {
  const units = [];
  let unit = null, topic = null;
  const trackFor = raw => {
    const want = raw.split(/[,/]/).map(s => s.trim().toLowerCase()).filter(Boolean);
    const hit = tracks.filter(t => want.some(w => t.toLowerCase() === w || t.toLowerCase().startsWith(w)));
    return hit.length && hit.length < tracks.length ? hit : [];
  };
  const getUnit = title => {
    unit = units.find(u => u.title === title);
    if (!unit) { unit = { id: uid('u'), title, hours: null, topics: [] }; units.push(unit); }
    topic = null;
    return unit;
  };
  const getTopic = raw => {
    if (!unit) getUnit('General');
    let m = raw.match(/^\[([^\]]+)\]\s*(.*)$/), tr = [];
    if (m) { tr = trackFor(m[1]); raw = m[2]; }
    const cm = raw.match(/^((?:SL|AHL|HL)?\s*\d+(?:\.\d+)*)\s+[-–:]?\s*(.+)$/i);
    const code = cm ? cm[1].trim() : '', title = cm ? cm[2].trim() : raw.trim();
    topic = unit.topics.find(t => t.title === title && t.code === code);
    if (!topic) { topic = { id: uid('t'), code, title, tracks: tr, outcomes: [] }; unit.topics.push(topic); }
    return topic;
  };
  const addOutcome = raw => {
    if (!topic) getTopic('General');
    let tr = [];
    const m = raw.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (m) { tr = trackFor(m[1]); raw = m[2]; }
    if (raw.trim()) topic.outcomes.push({ id: uid('o'), text: raw.trim(), tracks: tr });
  };
  String(text).split(/\r?\n/).forEach(line => {
    if (!line.trim()) return;
    if (line.includes('\t')) { // Excel row
      const [u, t, o, tr] = line.split('\t').map(s => (s || '').trim());
      if (/^(unit|strand|ünite)$/i.test(u) && /^(topic|konu)$/i.test(t)) return; // header row
      if (u) getUnit(u); else if (!unit) getUnit('General');
      if (t && (!topic || topic.title !== t)) getTopic(t);
      if (o) addOutcome(tr ? `[${tr}] ${o}` : o);
      return;
    }
    const s = line.trim();
    if (/^##(?!#)\s*/.test(s)) getUnit(s.replace(/^##\s*/, ''));
    else if (/^###\s*/.test(s)) getTopic(s.replace(/^###\s*/, ''));
    else if (/^#\s+/.test(s)) getUnit(s.replace(/^#\s*/, ''));
    else if (/^([-*•]|\d+[.)])\s+/.test(s)) addOutcome(s.replace(/^([-*•]|\d+[.)])\s+/, ''));
    else if (topic) addOutcome(s);
    else getTopic(s);
  });
  return units;
}
function curriculumToText(c) {
  const tag = item => item.tracks?.length && item.tracks.length < c.tracks.length ? `[${item.tracks.join(',')}] ` : '';
  return c.units.map(u => `## ${u.title}\n` + u.topics.map(t =>
    `### ${tag(t)}${t.code ? t.code + ' ' : ''}${t.title}\n` + t.outcomes.map(o => `- ${tag(o)}${o.text}`).join('\n')).join('\n\n')).join('\n\n') + '\n';
}
