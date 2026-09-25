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
    { id: 'myp8', name: 'MYP Mathematics — Grade 8', short: 'MYP 8', programme: 'MYP', tracks: [], units: [] },
    { id: 'myp9', name: 'MYP Mathematics — Grade 9', short: 'MYP 9', programme: 'MYP', tracks: ['Standard', 'Extended'], units: [] },
    { id: 'myp10', name: 'MYP Mathematics — Grade 10', short: 'MYP 10', programme: 'MYP', tracks: ['Standard', 'Extended'], units: [] },
    { id: 'dp-aa', name: 'DP Mathematics: Analysis and Approaches', short: 'DP AA', programme: 'DP', tracks: ['SL', 'HL'], builtin: true, source, units: buildUnits('dp-aa', AA_UNITS) },
    { id: 'dp-ai', name: 'DP Mathematics: Applications and Interpretation', short: 'DP AI', programme: 'DP', tracks: ['SL', 'HL'], builtin: true, source, units: buildUnits('dp-ai', AI_UNITS) },
  ];
}

/* ---------- state & lookup helpers ---------- */
function ensureCurricula() {
  const S = App.state;
  if (!Array.isArray(S.curricula)) { S.curricula = builtinCurricula(); App.save(true); }
  S.classLevels = S.classLevels || {};
  return S.curricula;
}
function curriculum(id) { return (App.state.curricula || []).find(c => c.id === id); }
function inTrack(item, track) { return !track || !item.tracks?.length || item.tracks.includes(track); }

// Every selectable level, e.g. "MYP 9 · Extended", "DP AA · HL".
function curriculumLevels() {
  return (App.state.curricula || []).flatMap(c => c.tracks.length
    ? c.tracks.map(t => ({ key: `${c.id}|${t}`, cid: c.id, track: t, label: `${c.short} · ${t}`, c }))
    : [{ key: c.id, cid: c.id, track: '', label: c.short, c }]);
}
function parseLevel(key) {
  const [cid, track = ''] = String(key || '').split('|');
  return { cid, track, c: curriculum(cid) };
}
function levelLabel(key) { const { c, track } = parseLevel(key); return c ? (track ? `${c.short} · ${track}` : c.short) : ''; }
function levelTopics(key) {
  const { c, track } = parseLevel(key);
  if (!c) return [];
  return c.units.flatMap(u => u.topics.filter(t => inTrack(t, track)).map(t => ({ unit: u, topic: t })));
}
function findTopic(topicId) {
  for (const c of App.state.curricula || []) for (const u of c.units) for (const t of u.topics) if (t.id === topicId) return { c, unit: u, topic: t };
  return null;
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
function courseForCurriculum(cid) { return { myp8: 'myp8', myp9: 'myp9', 'dp-ai': 'dpaisl' }[cid] || ''; }

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
